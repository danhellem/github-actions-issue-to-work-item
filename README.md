# Sync GitHub issue to Azure DevOps work item

Create work item in Azure DevOps when a GitHub Issue is created

Update Azure DevOps work item when a GitHub Issue is updated

![alt text](./assets/demo.gif "animated demo")

## Outputs

### `id`

The id of the Work Item created or updated

## GraphQL
This action uses graphQL to get the Sprint and Story Points values from the project the issue is assigned to.  It relies on the fields to have the following names:
- Story Points: "Story"
- Iteration / Sprint: "Sprint"

If a different name is used change the "name" field in "fieldValueByName" for Sprint or Story as needed.

## Triggers

Action is triggered on the following:
  - issues that are opened, edited, deleted, closed, reopened, labeled, unlabeled, or assigned
  - issue_comments that are created, edited, or deleted

## Setup

### Repository Setup

You'll need the following to setup the action:

1. Add a secret named `ADO_PERSONAL_ACCESS_TOKEN` containing an [Azure Personal Access Token](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate) with "read & write" permission for Work Items
2. Add an optional secret named `GH_PERSONAL_ACCESS_TOKEN` containing a [GitHub Personal Access Token](https://help.github.com/en/enterprise/2.17/user/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) with "repo", "admin:org", "read:project" permissions.
3. Install the [Azure Boards App](https://github.com/marketplace/azure-boards) from the GitHub Marketplace.  To enable the app for a repository follow these steps:
   - Navigate to the organization the repository is in.
   -  Click on "Settings" across the banner below the organization name.
   -  Click on "GitHub Apps" in the menu on the left.
   -  Click on "Configure" for the Azure Boards applicaiton.
   -  Click "Save" towards the bottom the page.
   -  Sign in with your Microsoft account.
   -  From the menu select the project you want to connect.  You can use the search feature to narrow down the choices.
   -  Click "Continue"
   -  Pick the correct Azure DevOps repository to add the Azure Boards feature.
4. Add a workflow like the example below.
-  Note the global env values.  Those are there to make the ado-sync vairables easier to set.

### Action Setup

1. Name of the ADO Organization `azure_org_name`
2. Name of the Azure DevOps Project Board to send the GitHub issues to. `azure_project_name`
3. ADO Work Order ID to assign "Related Work" (if needed) `azure_parent_id`
4. What Azure DevOps "Area" the tickets should be assigned to by default (if needed) `azure_area_subname`

```yaml
name: GitHub Sync issue to Azure DevOps work item

on:
  issues:
    types:
      [opened, edited, deleted, closed, reopened, labeled, unlabeled, assigned]
  issue_comment:
    types:
      [created, edited, deleted]

env:
  GH_TOKEN: "${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}"
  ado_token: "${{ secrets.ADO_PERSONAL_ACCESS_TOKEN }}"
  github_token: "${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}"
  azure_org_name: "GeneralMills"
  azure_project_name: "Cloverleaf"
  azure_area_subname: "Cloud Platform"
  azure_parent_id: "840193"

jobs:
  get-issue-info:
    runs-on: gcp
    container: docker.generalmills.com/k8s-ghcli:44-dea02e4
    outputs:
      gh_iteration: ${{ steps.get-issue-info.outputs.iteration }}
      gh_story_points: ${{ steps.get-issue-info.outputs.story_points }}
      gh_current_sprint: ${{ steps.get-issue-info.outputs.current_sprint }}
      gh_assignee: ${{ steps.get-issue-info.outputs.assignee }}
    steps:
    - id: get-issue-info
      run: |
        gh api graphql -f query='query get_iteration_title ($owner:String!, $repo:String!, $gh_issue_number:Int!) {
          repository(name: $repo, owner: $owner) {
            issue(number: $gh_issue_number) {
              title
              projectItems(first: 1) {
                nodes {
                  sprint: fieldValueByName(name: "Sprint") {
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                    }
                  }
                  story: fieldValueByName(name: "Story") {
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                    }
                  }
                }
              }
              assignees (first: 1) {
                nodes {
                  login
                }
              }
            }
          }
        }' -F owner=${{ github.repository_owner }} -F repo=${{ github.event.repository.name }} -F gh_issue_number=${{ github.event.issue.number }} > result.json
        if [ $(jq -r '.data.repository.issue.assignees.nodes[0].login' result.json) = "null" ]
        then
          github_assignee="null null"
        else
          github_assignee=$(jq -r '.data.repository.issue.assignees.nodes[0].login' result.json)
          echo "GitHub Assignee: $github_assignee"
          gh api graphql -f query='query get_assignee ($owner:String!,$assignee:String!){
            organization(login: $owner) {
              samlIdentityProvider {
                externalIdentities(first: 1, login: $assignee) {
                  edges {
                    node {
                      samlIdentity {
                        givenName
                        familyName
                      }
                    }
                  }
                }
              }
            }
          }' -F owner=${{ github.repository_owner }} -F assignee="$github_assignee" > name.json
          first=$(jq -r '.data.organization.samlIdentityProvider.externalIdentities.edges[0].node.samlIdentity.givenName' name.json)
          last=$(jq -r '.data.organization.samlIdentityProvider.externalIdentities.edges[0].node.samlIdentity.familyName' name.json)
          echo ::set-output name=assignee::"$first $last"
          echo "GitHub Assignee Name: $first $last"
        fi

        curl -u :"${{ secrets.ADO_PERSONAL_ACCESS_TOKEN }}"  'https://dev.azure.com/${{ env.azure_org_name }}/${{ env.azure_project_name }}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=6.0' > currentsprint.json
        echo ::set-output name=iteration::$(jq -r '.data.repository.issue.projectItems.nodes[0].sprint.title' result.json)
        echo ::set-output name=story_points::$(jq -r '.data.repository.issue.projectItems.nodes[0].story.number' result.json)
        echo ::set-output name=current_sprint::$(jq -r '.value[0].name' currentsprint.json)
        echo $(jq -r '.data.repository.issue.assignees.nodes[0].login' result.json)

  ado-sync:
    runs-on: gcp
    needs: get-issue-info
    steps:
    - uses: GeneralMills/github-actions-issue-to-work-item@master
      env:
        ado_token: "${{ secrets.ADO_PERSONAL_ACCESS_TOKEN }}"
        github_token: "${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}"
        ado_organization: "${{ env.azure_org_name }}"
        ado_project: "${{ env.azure_project_name }}"
        ado_area_path: "${{ env.azure_project_name }}\\$ {{ env.azure_area_subname }}"
        ado_wit: "User Story"
        ado_new_state: "New"
        ado_active_state: "Active"
        ado_close_state: "Closed"
        ado_parent: "${{ env.azure_parent_id }}"
        ado_current_sprint: "${{ env.azure_project_name }}\\${{ needs.get-issue-info.outputs.gh_current_sprint }}"
        ado_iteration: "${{ env.azure_project_name }}\\${{ needs.get-issue-info.outputs.gh_iteration }}"
        ado_story_points: "${{ needs.get-issue-info.outputs.gh_story_points }}"
        ado_assignee: "${{ needs.get-issue-info.outputs.gh_assignee }}"
        ado_bypassrules: true
        log_level: 400

```


 ## Env Variables

 ### Global ENV

   - `azure_org_name`: The top level (root) organization in ADO.
   - `azure_project_name`: The name of the project in ADO.
   - `azure_area_subname`: The subname to complete the iteration area path in ADO  AKA "Area"
   - `azure_parent_id`: The parent work item to nest the ADO entry into. AKA "Related Work"

 ### ado-sync ENV
   - `ado_organization`: Set from the `azure_org_name` Global ENV.
   - `ado_project`: Set from the `azure_project_name` Global ENV.
   - `ado_area_path`: Built from combining the `azure_project_name` and `azure_area_subname` Global ENV
   - `ado_wit`: The type of work item you want the ADO entry to have. "User Story" is the typical default.  
   - `ado_new_state`: When a new work item is created in ADO, use this state.  "New" is default
   - `ado_active_state`: When a work item is reopened in ADO, use this state.  "Active" is default.
   - `ado_close_state`: When closing a work item, use this state in ADO.  "Closed" is default.
   - `ado_parent`: "Set from the `azure_parent_id` Global ENV.
   - `ado_current_sprint`: Built from the `azure_project_name` and the current sprint in ADO.  Used to create a value if the sprint is not set in the GitHub Issue.  The current ADO sprint is pulled using a REST API call to the ADO Project's iteration for the team.
   - `ado_iteration`: Built from the `azure_project_name` and a GraphQL query finds the sprint name and automatically assignes it.  If it was not, then the `ado_current_sprint` is used in it's place.
   - `ado_story_points`: The points set in the GitHub issue.  Default is 1.
   - `ado_assignee`: The first assignee listed in the issue.  If there is none listed the work item in ADO will be listed as "Unassigned" by default.
   - `ado_bypassrules`: Used to bypass any rules on the form to ensure the work item gets created in Azure DevOps. However, some organizations getting bypassrules permissions for the token owner can go against policy. By default the bypassrules will be set to false. If you have rules on your form that prevent the work item to be created with just Title and Description, then you will need to set to true.
   - `log_level`: Used to set the logging verbosity to help with debugging in a production environment. 100 is the default, 400 is the max.

