const core = require(`@actions/core`);
const github = require(`@actions/github`);
const azdev = require(`azure-devops-node-api`);

var _adoHelper = {
	organization: "",
	orgUrl: "",
	token: "",
	project: "",
	wit: ""
};

// create Work Item via https://docs.microsoft.com/en-us/rest/api/azure/devops/
async function createWorkItem(vm) {
	let authHandler = azdev.getPersonalAccessTokenHandler(_adoHelper.token);
	let connection = new azdev.WebApi(_adoHelper.orgUrl, authHandler);
	let client = await connection.getWorkItemTrackingApi();

	let patchDocument = [
		{
			op: "add",
			path: "/fields/System.Title",
			value: vm.title + " (GitHub Issue #" + vm.number + ")"
		},
		{
			op: "add",
			path: "/fields/System.Description",
			value: vm.body
		},
		{
			op: "add",
			path: "/fields/System.Tags",
			value: "GitHub Issue; " + vm.repo_name
		},
		{
			op: "add",
			path: "/fields/System.History",
			value:
				'GitHub <a href="' +
				vm.url +
				'" target="_new">issue #' +
				vm.number +
				'</a> created in <a href="' +
				vm.repo_url +
				'" target="_new">' +
				vm.repo_fullname +
				"</a>"
		},
		{
			op: "add",
			path: "/relations/-",
			value: {
				rel: "Hyperlink",
				url: vm.url
			}
		}
	];

	let workItemSaveResult = await client.createWorkItem(
		(customHeaders = []),
		(document = patchDocument),
		(project = _adoHelper.project),
		(type = _adoHelper.wit)
	);

	console.log("");
	console.log("Create work save result...");
	console.log(workItemSaveResult);

	return workItemSaveResult;
}

async function findWorkItem(number, repository) {
	let authHandler = azdev.getPersonalAccessTokenHandler(_adoHelper.token);
	let connection = new azdev.WebApi(_adoHelper.orgUrl, authHandler);
	let client = await connection.getWorkItemTrackingApi();

	let teamContext = { project: _adoHelper.project };
	let wiql = {
		query:
			"SELECT [System.Id], [System.WorkItemType], [System.Description], [System.Title], [System.AssignedTo], [System.State], [System.Tags] FROM workitems WHERE [System.TeamProject] = @project AND [System.Title] CONTAINS '(GitHub Issue #" +
			number +
			")' AND [System.Tags] CONTAINS 'GitHub Issue' AND [System.Tags] CONTAINS '" +
			repository +
			"'"
	};

	let queryResult = await client.queryByWiql(wiql, teamContext);
	let workItem = queryResult.workItems.length > 0 ? queryResult.workItems[0] : null;

	if (workItem != null) {
		var result = await client.getWorkItem(workItem.id, null, null, 4);
		return result;
	}
	else {
		return null;
	}
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
		organization: "",
		repository: ""
	};

	// label is not always part of the payload
	if (payload.label != undefined) {
		vm.label = payload.label.name != undefined ? payload.label.name : "";
	}

	// comments are not always part of the payload
	// prettier-ignore
	if (payload.comment != undefined) {
		vm.comment_text = payload.comment.body != undefined ? payload.comment.body : "";
		vm.comment_url = payload.comment.html_url != undefined ? payload.comment.html_url : "";
	}

	// split repo full name to get the org and repository names
	if (vm.repo_fullname != "") {
		var split = payload.repository.full_name.split("/");
		vm.organization = split[0] != undefined ? split[0] : "";
		vm.repository = split[1] != undefined ? split[1] : "";
	}

	return vm;
}

async function main() {
	try {
		const context = github.context;
		const env = process.env;

		_adoHelper.organization = env.ado_organization != undefined ? env.ado_organization : "";
		_adoHelper.orgUrl = _adoHelper.organization != undefined ? "https://dev.azure.com/" + _adoHelper.organization : "";
		_adoHelper.token = env.ado_token != undefined ? env.ado_token : "";
		_adoHelper.project = env.ado_project != undefined ? env.ado_project : "";
		_adoHelper.wit = env.ado_wit != undefined ? env.ado_wit : "";

		// todo: validate we have all the right inputs		

		console.log("Set values from payload");
		const vm = getValuesFromPayload(github.context.payload);

		// go check to see if work item already exists in ado or not
		// based on the title and tags		
		console.log("Check to see if work item already exists");
		let workItem = await findWorkItem(vm.number, vm.repository);

		// if a work item was not found, go create one
		if (workItem === null) {
			console.log("No work item found, creating work item from issue")
			workItem = await createWorkItem(vm);
		}
		else {
			console.log(`Existing work item found: ${workItem.id}`);
		}

		//TBD: handle updates and edge cases
	} catch (error) {
		core.setFailed(error.message);
	}
}

main();