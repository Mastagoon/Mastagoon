import Log from "../logger"

type ResponseModel = {
	status: number
	body?: any
	error?: any
}

const get = async (url: string, retries = 0): Promise<ResponseModel> => {
	try {
		Log.info(`GET --> ${url}`)
		const result = await fetch(url, {
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer " + process.env.GITHUB_TOKEN,
			},
		})
		Log.info(`result <-- ${result.status} - ${result.statusText}`)
		if (result.status > 500 && retries < 5) {
			Log.info(`Retrying... ${retries}`)
			// wait for 30 seconds
			await new Promise((resolve) => setTimeout(resolve, 30000))
			return get(url, retries + 1)
		}
		if (result.status >= 400) throw new Error("Failed!")
		const data = await result.json()
		return { status: result.status, body: data }
	} catch (err: any) {
		return { status: err.status ?? 500, error: err }
	}
}


const post = async (url: string, body: any, retries = 0): Promise<ResponseModel> => {
	try {
		Log.info(`POST --> ${url}\n${JSON.stringify(body, null, 2)}`)
		const result = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer " + process.env.GITHUB_TOKEN,
			},
			body: JSON.stringify(body),
		})
		Log.info(`POST <-- ${url}\n${JSON.stringify(result, null, 2)}`)
		// retry 500 errors. which happen sometimes for no reason
		if (result.status > 500 && retries < 5) {
			retries++
			Log.info(`Retrying... ${retries}`)
			// wait for 30 seconds
			await new Promise((resolve) => setTimeout(resolve, 30000))
			return post(url, body, retries + 1)
		}
		if (result.status >= 400) throw new Error("Failed!")
		const data = await result.json()
		return { status: result.status, body: data }
	} catch (err: any) {
		return { status: err.status ?? 500, error: err }
	}
}


const patch = async (url: string, body: any, retries = 0): Promise<ResponseModel> => {
	try {
		Log.info(`PATCH`)
		const result = await fetch(url, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer " + process.env.GITHUB_TOKEN,
			},
			body: JSON.stringify(body),
		})
		Log.info(`PATCH <-- ${url}\n${JSON.stringify(result, null, 2)}`)
		// retry 500 errors. which happen sometimes for no reason
		if (result.status > 500 && retries < 5) {
			retries++
			Log.info(`Retrying... ${retries}`)
			// wait for 30 seconds
			await new Promise((resolve) => setTimeout(resolve, 30000))
			return patch(url, body, retries + 1)
		}
		if (result.status >= 400) throw new Error("Failed!")
		const data = await result.json()
		return { status: result.status, body: data }
	} catch (err: any) {
		return { status: err.status ?? 500, error: err }
	}
}

export const getRepo = async (owner: string, repo: string): Promise<ResponseModel> => {
	const url = `https://api.github.com/repos/${owner}/${repo}`
	return get(url)
}

export const getIssue = async (owner: string, repo: string, issueNumber: string): Promise<ResponseModel> => {
	const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`
	return get(url)
}

export const replyToIssue = async (owner: string, repo: string, issueNumber: string, body: string, close: boolean = true): Promise<ResponseModel> => {
	const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`
	const data = {
		body,
	}
	const result = await post(url, data)
	if (close) {
		const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`
		const data = {
			state: "closed",
		}
		await patch(url, data)
	}
	return result
}
