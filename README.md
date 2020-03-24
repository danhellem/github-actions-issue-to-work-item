# GitHub Issue to Work Item
Create a Work Item on an Azure Board when a GitHub Issue is created

## Outputs

### `id`

The id of the Work Item created

## Example usage

1. Add a Secret named `AZURE_PERSONAL_ACCESS_TOKEN` containing an [Azure Personal Access Token](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate) with "read & write" permission for Work Items

2. Add a workflow file which responds to Pull Requests, customizing the ORG_URL and PROJECT_NAME properties:

```yaml
name: Create Work Item from Issue

'on':
  issues:
    types: [opened]

jobs:
  alert:
    runs-on: ubuntu-latest
    steps:
    - uses: danhellem/github-actions-issue-to-work-item@master
      env:
        ado-token: '${{ secrets.AZURE_PERSONAL_ACCESS_TOKEN }}'
        ado-organization: 'https://dev.azure.com/your_org_name'
        ado-project: 'your_project_name'
        ado-wit: 'Issue'
```
