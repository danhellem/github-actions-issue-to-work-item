# Sync GitHub issue to Azure DevOps work item

Create work item in Azure DevOps when a GitHub Issue is created

Update Azure DevOps work item when a GitHub Issue is updated

![alt text](./assets/demo.gif "animated demo")

## Outputs

### `id`

The id of the Work Item created or updated

## Example usage

1. Add a secret named `ADO_PERSONAL_ACCESS_TOKEN` containing an [Azure Personal Access Token](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate) with "read & write" permission for Work Items

2. Add an optional secret named `GH_PERSONAL_ACCESS_TOKEN` containing a [GitHub Personal Access Token](https://help.github.com/en/enterprise/2.17/user/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) with "repo" permissions. See optional information below.

3. Install the [Azure Boards App](https://github.com/marketplace/azure-boards) from the GitHub Marketplace

4. Add a workflow file which responds to issue events.

   - Set Azure DevOps organization and project details.
   - Set specific work item type settings (type, new state, closed state)

   Optional Env Variables

   - `ado_area_path`: To set a specific area path you want your work items created in. If providing a full qualified path such as `area\sub_area`, then be sure to use the format of: `ado_area_path: "area\\area"` to avoid parsing failures.
   - `ado_iteration_path`: To set a specific iteration path you want your work items created in. If providing a full qualified path such as `iteration\sub iteration`, then be sure to use the format of: `ado_iteration_path: "iteration\\iteration"` to avoid parsing failures.
   - `github_token`: Used to update the Issue with AB# syntax to link the work item to the issue. This will only work if the project is configured to use the [GitHub Azure Boards](https://github.com/marketplace/azure-boards) app. If you do not define this value, the action will still work, but the experience is not as nice.
   - `ado_parent`: Used to set a specific related work item in the work item.
   - `ado_bypassrules`: Used to bypass any rules on the form to ensure the work item gets created in Azure DevOps. However, some organizations getting bypassrules permissions for the token owner can go against policy. By default the bypassrules will be set to false. If you have rules on your form that prevent the work item to be created with just Title and Description, then you will need to set to true.
   - `log_level`: Used to set the logging verbosity to help with debugging in a production environment. 100 is the default. 

     **Warning:** Setting `log_level` to 300 will log out environment info, work items, and issue data. Only use 300 when debugging issues.

```yaml
name: GraphQL Sync issue to Azure DevOps work item

on:
  issues:
    types:
      [opened, edited, deleted, closed, reopened, labeled, unlabeled, assigned]
  issue_comment:
    types:
      [created, edited, deleted]
      
env:
  GH_TOKEN: "${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}"

jobs:
  graphql:
    runs-on: gcp
    container: docker.generalmills.com/k8s-ghcli:44-dea02e4
    name: graphql
    permissions:
      actions: none
      checks: none
      contents: none
      deployments: none
      id-token: none
      issues: read
      discussions: none
      packages: none
      pages: none
      pull-requests: none
      repository-projects: none
      security-events: none
      statuses: none
    outputs:
      gh_iteration: ${{ steps.get-query.outputs.iteration }}
      gh_story_points: ${{ steps.get-query.outputs.story_points }}
    steps:
      - id: get-query
        run: |
          gh api graphql -f query='query get_iteration_title ($owner:String!, $repo:String!, $gh_issue_number:Int!) {
            repository(name: $repo, owner: $owner) {
              issue(number: $gh_issue_number) {
                title
                projectItems(first: 1) {
                  nodes {
                    sprint:fieldValueByName(name: "Sprint") {
                      ... on ProjectV2ItemFieldIterationValue {
                        title
                      }
                    }
                    story:fieldValueByName(name: "Story") {
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                      }
                    }
                  }
                }
              }
            }
          }' -F owner=${{ github.repository_owner }} -F repo=${{ github.event.repository.name }} -F gh_issue_number=${{ github.event.issue.number }} > result.json
          echo ""
          echo ::set-output name=iteration::$(jq -r '.data.repository.issue.projectItems.nodes[0].sprint.title' result.json)
          echo ::set-output name=story_points::$(jq -r '.data.repository.issue.projectItems.nodes[0].story.number' result.json)
  adosync:
    runs-on: gcp
    needs: graphql
    steps:    
    - uses: GeneralMills/github-actions-issue-to-work-item@master
      env:
        ado_token: "${{ secrets.ADO_PERSONAL_ACCESS_TOKEN }}"
        github_token: "${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}"
        ado_organization: "GeneralMills"
        ado_project: "GithubActionsTest"
        ado_area_path: "GithubActionsTest\\Support"
        ado_wit: "User Story"
        ado_new_state: "New"
        ado_active_state: "Active"
        ado_close_state: "Closed"
        ado_parent: "840193"
        ado_iteration: "GithubActionsTest\\${{ needs.graphql.outputs.gh_iteration }}"
        ado_story_points: "${{ needs.graphql.outputs.gh_story_points }}"
        ado_bypassrules: true
        log_level: 400 
```
