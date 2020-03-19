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
		action: payload.action != undefined ? payload.action : "",
		url: payload.issue.html_url != undefined ? payload.issue.html_url : "",
		number: payload.issue.number != undefined ? payload.issue.number : -1,
		title: payload.issue.title != undefined ? payload.issue.title : "",
		state: payload.issue.state != undefined ? payload.issue.state : "",
		user: payload.issue.user.login != undefined ? payload.issue.user.login : "",
		body: payload.issue.body != undefined ? payload.issue.body : "",
		repo_fullname: payload.repository.full_name != undefined ? payload.repository.full_name : "",
		repo_name: payload.repository.name != undefined ? payload.repository.name : "",
		repo_url: payload.repository.html_url != undefined ? payload.repository.html_url : "",
		closed_at: payload.issue.closed_at != undefined ? payload.issue.closed_at : null,
		label: "",
		comment_text: "",
		comment_url: "",
		organization: function() {
			var split = payload.repository.full_name.split('/');
			return split[0];
		},
		repository: function() {
			var split = payload.repository.full_name.split('/');
			return split[1];
		}
	};

	if (payload.label != undefined) {
		vm.label = payload.label.name != undefined ? payload.label.name : "";
	}

	// prettier-ignore
	if (payload.comment != undefined) {
		vm.comment_text = payload.comment.body != undefined ? payload.comment.body : "";
		vm.comment_url = payload.comment.html_url != undefined ? payload.comment.html_url : "";
	}

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
