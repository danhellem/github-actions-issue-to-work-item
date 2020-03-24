![Sync Issue to Azure DevOps work item](https://github.com/danhellem/github-actions-issue-to-work-item/workflows/Sync%20Issue%20to%20Azure%20DevOps%20work%20item/badge.svg?event=issues)

## GitHub Action : sysnc GitHub issue to Azure DevOps work item

Create work item in Azure DevOps when a GitHub Issue is created

Update Azure DevOps work item when a GitHub Issue is updated

## Outputs

### `id`

The id of the Work Item created or updated

## Example usage

1. Add a Secret named `AZURE_PERSONAL_ACCESS_TOKEN` containing an [Azure Personal Access Token](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate) with "read & write" permission for Work Items

2. Add a workflow file which responds to issue events.

   Set Azure DevOps organization and project details.

   Set specific work item type settings (type, new state, closed state)

```yaml
name: Sync issue to Azure DevOps work item

"on":
  issues:
    types:
      [opened, edited, deleted, closed, reopened, labeled, unlabeled, assigned]

jobs:
  alert:
    runs-on: ubuntu-latest
    steps:
      - uses: danhellem/github-actions-issue-to-work-item@master
        env:
          ado_token: "${{ secrets.ADO_PERSONAL_ACCESS_TOKEN }}"
          ado_organization: "ado_organization_name"
          ado_project: "your_project_name"
          ado_wit: "Issue"
          ado_new_state: "To Do"
          ado_close_state: "Done"
```
