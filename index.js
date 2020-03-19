const core = require(`@actions/core`);
const github = require(`@actions/github`);
const azdev = require(`azure-devops-node-api`);

var payloadVm = {
	action: "",
	url: "",
	number: -1,
	title: "",
	state: "",
	user: "",
	body: "",
	repo_fullname: "",
	repo_name: "",
	repo_url: "",
	closed_at: null,
	label: "",
	comment: "",
	organization: "",
	repsitory: ""
};

// create Work Item via https://docs.microsoft.com/en-us/rest/api/azure/devops/
async function createIssue(
	token,
	organization,
	projectName,
	title,
	description
) {
	let orgUrl = "https://dev.azure.com/" + organization;
	let authHandler = azdev.getPersonalAccessTokenHandler(token);
	let connection = new azdev.WebApi(orgUrl, authHandler);

	let workapi = await connection.getWorkItemTrackingApi();

	return workapi.createWorkItem(
		(customHeaders = []),
		(document = [
			{ op: "add", path: "/fields/System.Title", value: title },
			{ op: "add", path: "/fields/System.Description", value: description },
			{
				op: "add",
				path: "/fields/Microsoft.VSTS.Common.Priority",
				value: priority
			}
		]),
		(project = projectName),
		(type = `Issue`)
	);
}

function getValuesFromPayload(payload) {
	payloadVm.action = payload.actiom != null ? payload.action : "";
	payloadVm.url = payload.issue.html_url != null ? payload.issue.html_url : "";

	return payloadVm;
}

try {
	let context = github.context;

	const env = process.env;

	console.log(`ado-organization: ${env.ado_organization}`);
	console.log(`ado-project: ${env.ado_project}`);
	console.log(`ado-wit: ${env.ado_wit}`);

	console.log("Full payload...");
	console.log(`${JSON.stringify(github.context.payload, undefined, 2)}`);

	var vm = this.getValuesFromPayload(github.context.payload);
	console.log("View Model...");
	console.log(`${JSON.stringify(vm, undefined, 2)}`);

	//TBD: extract Issue info from context
	//TBD: createIssue()
} catch (error) {
	core.setFailed(error.message);
}
