const core = require(`@actions/core`);
const github = require(`@actions/github`);
const azdev = require(`azure-devops-node-api`);

// create Work Item via https://docs.microsoft.com/en-us/rest/api/azure/devops/
async function createIssue(token, orgUrl, projectName, title, description, priority) {
  let authHandler = azdev.getPersonalAccessTokenHandler(token); 
  let connection = new azdev.WebApi(orgUrl, authHandler);
  let workapi = await connection.getWorkItemTrackingApi();
  return workapi.createWorkItem(
    customHeaders = [],
    document = [
      { 'op': 'add', 'path': '/fields/System.Title', 'value': title },
      { 'op': 'add', 'path': '/fields/System.Description', 'value': description },
      { 'op': 'add', 'path': '/fields/Microsoft.VSTS.Common.Priority', 'value': priority },
    ],
    project = projectName,
    type = `Issue`
    )
}

try {
  let context = github.context
  //TBD: extract Issue info from context
  //TBD: createIssue()
} catch (error) {
  core.setFailed(error.message);
}