# Sync GitHub issue to Azure DevOps work item

Create work item in Azure DevOps when a GitHub Issue is created

Update Azure DevOps work item when a GitHub Issue is updated

![alt text](./assets/demo.gif "animated demo")

## Outputs

### `id`

The id of the Work Item created or updated

## Examples

### Entra ID Service Principal

1. Register an [Entra ID app registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
1. Configure the app registration with a [federated identity for GitHub Actions](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust?pivots=identity-wif-apps-methods-azp#github-actions)
1. Add your Entra ID app registration [to your Azure DevOps organization](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity?view=azure-devops#2-add-and-manage-service-principals-in-an-azure-devops-organization), with work item write permissions
1. [Create Actions variables or secrets](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity?view=azure-devops#2-add-and-manage-service-principals-in-an-azure-devops-organization) for the application ID (`ENTRA_APP_CLIENT_ID`) and tenant ID (`ENTRA_APP_TENANT_ID`)
1. Add an optional secret named `GH_PERSONAL_ACCESS_TOKEN` containing a [GitHub Personal Access Token](https://help.github.com/en/enterprise/2.17/user/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) with "repo" permissions. See optional information below.
1. Add a workflow file which responds to issue events, generates an Entra ID token, and syncs the issue

   - Set Azure DevOps organization and project details.
   - Set specific work item type settings (type, new state, closed state)

   Optional Env Variables

   - `ado_area_path`: To set a specific area path you want your work items created in. If providing a full qualified path such as `area\sub_area`, then be sure to use the format of: `ado_area_path: "area\\area"` to avoid parsing failures.
   - `ado_iteration_path`: To set a specific iteration path you want your work items created in. If providing a full qualified path such as `iteration\sub iteration`, then be sure to use the format of: `ado_iteration_path: "iteration\\iteration"` to avoid parsing failures.
   - `github_token`: Used to update the Issue with AB# syntax to link the work item to the issue. This will only work if the project is configured to use the [GitHub Azure Boards](https://github.com/marketplace/azure-boards) app. If you do not define this value, the action will still work, but the experience is not as nice.
   - `ado_bypassrules`: Used to bypass any rules on the form to ensure the work item gets created in Azure DevOps. However, some organizations getting bypassrules permissions for the token owner can go against policy. By default the bypassrules will be set to false. If you have rules on your form that prevent the work item to be created with just Title and Description, then you will need to set to true.
   - `log_level`: Used to set the logging verbosity to help with debugging in a production environment. 100 is the default. 

     **Warning:** Setting `log_level` to 300 will log out environment info, work items, and issue data. Only use 300 when debugging issues.

```yaml
name: Sync issue to Azure DevOps work item

on:
  issues:
    types:
      [opened, edited, deleted, closed, reopened, labeled, unlabeled, assigned]
  issue_comment:
    types: [created, edited, deleted]
    
concurrency:
  group: issue-${{ github.event.issue.number }}
  cancel-in-progress: false

# Extra permissions needed to login with Entra ID service principal via federated identity
permissions:
  id-token: write
  issues: write

jobs:
  alert:
    if: ${{ !github.event.issue.pull_request }}
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.ENTRA_APP_CLIENT_ID }}
          tenant-id: ${{ secrets.ENTRA_APP_TENANT_ID }}
          allow-no-subscriptions: true
      - name: Get Azure DevOps token
        id: get_ado_token
        run:
          # The resource ID for Azure DevOps is always 499b84ac-1321-427f-aa17-267ca6975798
          # https://learn.microsoft.com/azure/devops/integrate/get-started/authentication/service-principal-managed-identity
          echo "ado_token=$(az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query "accessToken" --output tsv)" >> $GITHUB_ENV
      - uses: danhellem/github-actions-issue-to-work-item@master
        env:
          ado_token: "${{ env.ado_token }}"
          github_token: "${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}"
          ado_organization: "ado_organization_name"
          ado_project: "your_project_name"
          ado_area_path: "optional_area_path\\optional_area_path"
          ado_iteration_path: "optional_iteration_path\\optional_iteration_path"
          ado_wit: "User Story"
          ado_new_state: "New"
          ado_active_state: "Active"
          ado_close_state: "Closed"
          ado_bypassrules: true
          log_level: 100
```


### Personal Access Token

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
   - `ado_bypassrules`: Used to bypass any rules on the form to ensure the work item gets created in Azure DevOps. However, some organizations getting bypassrules permissions for the token owner can go against policy. By default the bypassrules will be set to false. If you have rules on your form that prevent the work item to be created with just Title and Description, then you will need to set to true.
   - `log_level`: Used to set the logging verbosity to help with debugging in a production environment. 100 is the default. 

     **Warning:** Setting `log_level` to 300 will log out environment info, work items, and issue data. Only use 300 when debugging issues.

```yaml
name: Sync issue to Azure DevOps work item

on:
  issues:
    types:
      [opened, edited, deleted, closed, reopened, labeled, unlabeled, assigned]
  issue_comment:
    types: [created, edited, deleted]

concurrency:
  group: issue-${{ github.event.issue.number }}
  cancel-in-progress: false

jobs:
  alert:
    if: ${{ !github.event.issue.pull_request }}
    runs-on: ubuntu-latest
    steps:
      - uses: danhellem/github-actions-issue-to-work-item@master
        env:
          ado_token: "${{ secrets.ADO_PERSONAL_ACCESS_TOKEN }}"
          github_token: "${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}"
          ado_organization: "ado_organization_name"
          ado_project: "your_project_name"
          ado_area_path: "optional_area_path\\optional_area_path"
          ado_iteration_path: "optional_iteration_path\\optional_iteration_path"
          ado_wit: "User Story"
          ado_new_state: "New"
          ado_active_state: "Active"
          ado_close_state: "Closed"
          ado_bypassrules: true
          log_level: 100
```
