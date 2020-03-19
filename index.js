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
	// prettier-ignore
	var vm = {
		action: payload.action != null ? payload.action : "",
		url: payload.issue.html_url != null ? payload.issue.html_url : "",
		number: payload.issue.number != null ? payload.issue.number : -1,
		title: payload.issue.title != null ? payload.issue.title : "",
		state: payload.issue.state != null ? payload.issue.state : "",
		user: payload.issue.user.login != null ? payload.issue.user.login : "",
		body: payload.issue.body != null ? payload.issue.body : "",
		repo_fullname: payload.repsitory.full_name != null ? payload.repsitory.full_name : "",
		repo_name: payload.repository.name != null ? payload.repository.name : "",
		repo_url: payload.repository.html_url != null ? payload.repository.html_url : "",
		closed_at: payload.issue.closed_at != null ? payload.issue.closed_at : null,
		label: payload.label.name != null ? payload.label.name : "",
		comment_text: payload.comment.body != null ? payload.comment.body : "",
		comment_url: payload.comment.html_url != null ? payload.comment.html_url : "",
		organization: function() {
			var split = payload.repository.full_name.split('/');
			return split[0];
		},
		repsitory: function() {
			var split = payload.repository.full_name.split('/');
			return split[1];
		}
	};

	return vm;
}

try {
	let context = github.context;

	const env = process.env;

	console.log(`ado-organization: ${env.ado_organization}`);
	console.log(`ado-project: ${env.ado_project}`);
	console.log(`ado-wit: ${env.ado_wit}`);

	console.log("Full payload...");
	console.log(`${JSON.stringify(github.context.payload, undefined, 2)}`);

	var vm = getValuesFromPayload(github.context.payload);
	console.log("View Model...");
	console.log(`${JSON.stringify(vm, undefined, 2)}`);

	//TBD: extract Issue info from context
	//TBD: createIssue()
} catch (error) {
	core.setFailed(error.message);
}
