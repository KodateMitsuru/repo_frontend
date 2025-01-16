const specialurl = ["/","/home","/packages","/about"];

export default {
	async fetch(request ,env) {
		const url = new URL(request.url);
		if(!specialurl.includes(url.pathname)){
			let isdb = true;
			let githubRawUrl = 'https://github.com/KodateMitsuru/customrepo/raw/refs/heads/main';
			if (url.pathname === "/custom.db") {
				githubRawUrl += "/custom.db.tar.gz";
			} else if (url.pathname === "/custom.db.sig") {
				githubRawUrl += "/custom.db.tar.gz.sig";
			} else if (url.pathname === "/custom.file") {
				githubRawUrl += "/custom.file.tar.gz";
			} else if (url.pathname === "/custom.file.sig") {
				githubRawUrl += "/custom.file.tar.gz.sig";
			} else {
				isdb = false;
				githubRawUrl += url.pathname;
			}
			githubRawUrl += "?download="
			if (!isdb && !url.pathname.endsWith(".pkg.tar.zst") && !url.pathname.endsWith(".pkg.tar.zst.sig")) {
				// 对非法访问返回404
				return new Response(await error(), { 
					status: 404,
					headers: {
						'Content-Type': 'text/html; charset=UTF-8',
					},
				});
			}
				
			// 构建请求头
			const headers = new Headers();

			// 发起请求
			const response = await fetch(githubRawUrl, { headers });

			// 检查请求是否成功 (状态码 200 到 299)
			if (response.ok) {
				return new Response(response.body, {
					status: response.status,
					headers: response.headers
				});
			}
				// 如果请求不成功，返回适当的错误响应
			return new Response(await error(), { 
				status: response.status,
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		}
		if (url.pathname === "/home"){

            return new Response(await home(), {
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8',
                },
            });
        }
		if (url.pathname === "/"){
			return new Response('', {
				status: 301,
				headers: {
				    'Location': "/home",
				}
			});
		} 
        if (url.pathname === "/packages"){
			return new Response(await packages(), {
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		}
	}
};

async function error() {
	const errorText = "errtext";
	return errorText ;
}

async function home() {
	const homeText = "hometext";
	return homeText ;
}

async function packages() {
	const packagesText = "packagestext";
	return packagesText ;
}
const scriptText = "scripttext";

const navbarText = "navbartext";

const headText = "headtext";