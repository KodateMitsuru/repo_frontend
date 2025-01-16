const specialurl = ["/","/home","/packages","/about"];
const scriptText = `
<script src="https://unpkg.com/swup@4"></script>
<script src="https://unpkg.com/@swup/preload-plugin@3"></script>
<script src="https://unpkg.com/@swup/scroll-plugin@3"></script>
<script src="https://unpkg.com/@swup/head-plugin@2"></script>
<script src="https://cdn.jsdelivr.net/npm/pako@2.0.4/dist/pako.min.js"></script>
<script>
	const swup = new Swup({
		plugins: [new SwupScrollPlugin(), new SwupPreloadPlugin(), new SwupHeadPlugin()]
	});
	function formatSize(size) {
		const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
		let unitIndex = 0;

		let value = size / 1024;

		// 自动选择合适的单位
		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex++;
		}

		// 格式化输出
		return (value.toFixed(2).toString() + units[unitIndex]);
	}
	async function getFileList() {
		try {
			const fileList = [];
			const response = await fetch("custom.db");
			const arrayBuffer = await response.arrayBuffer();
			const compressedData = new Uint8Array(arrayBuffer);
            const decompressedData = new TextDecoder().decode(pako.ungzip(compressedData));
			const string = decompressedData.split("\\n");
			for (let i = 0; i < string.length - 1; i++) {
				if (string[i].endsWith("%FILENAME%")) {
					fileList.push({"name":string[i + 1],"size":"Loading..."});
					fileList.push({"name":string[i + 1]+".sig","size":"Loading..."});
				}
			}
			if (fileList.length === 0) {
				console.log('No File found');
			}
			return fileList;
			
		} catch (error) {
			console.error('There was a problem with the fetch operation:', error);
		}
	}

	async function fetchLFSFileSize(url) {
		try {
			const response = await fetch(url);
			const text = await response.text();
			const sizeLine = text.split("\\n").find(line => line.startsWith('size'));
			if (sizeLine) {
				const size = sizeLine.split(' ')[1];
				return size;
			} else {
				throw new Error('Size not found in file content');
			}
		} catch (error) {
			console.error('Error fetching file content size:', error);
			return 0;
		}
	}
	async function fetchFileSize(file) {
		const cachedSize = localStorage.getItem(file);
		if (cachedSize) {
			size = cachedSize;
		} else {
			size = await fetchLFSFileSize("https://raw.githubusercontent.com/KodateMitsuru/customrepo/refs/heads/main/" + file);
			localStorage.setItem(file, size);
		}
		const sizeStr = formatSize(size);
		return sizeStr;
	}

	async function fetchFileSHA256(url) {
		const cachedHash = localStorage.getItem(url);
		if (cachedHash) {
			return cachedHash;
		} else {
			try {
				const response = await fetch(url);
				const text = await response.text();
				const shaLine = text.split("\\n").find(line => line.startsWith('oid sha256:'));
				if (shaLine) {
					const sha = shaLine.split(':')[1];
					localStorage.setItem(url, sha);
					return sha;
				} else {
					throw new Error('SHA256 not found in file content');
				}
			} catch (error) {
				console.error('Error fetching file SHA256:', error);
				return 'Unknown SHA256';
			}
		}
	}

	async function renderFileList() {
		const fileList = await getFileList();

		const container = document.getElementById('file-list-container');
		if (!container) return;
		const descriptionRow = document.createElement('div');
		descriptionRow.className = 'file-list-item';
		descriptionRow.style.fontWeight = 'bold';

		const nameDescription = document.createElement('span');
		nameDescription.className = 'file-name';
		nameDescription.textContent = '文件名';
		descriptionRow.appendChild(nameDescription);

		const sizeDescription = document.createElement('span');
		sizeDescription.className = 'file-size';
		sizeDescription.textContent = '大小';
		descriptionRow.appendChild(sizeDescription);

		const shaDescription = document.createElement('span');
		shaDescription.className = 'file-sha';
		shaDescription.textContent = 'HASH';
		descriptionRow.appendChild(shaDescription);

		container.appendChild(descriptionRow);
		fileList.forEach(async file => {
			const li = document.createElement('li');
			li.className = 'file-list-item';

			const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			icon.setAttribute("viewBox", "0 0 20 20");
			icon.setAttribute("fill", "none");
			icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
			icon.classList.add("file-icon");

			const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			path.setAttribute("d", "M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z");
			path.setAttribute("stroke", "#5C667A");
			path.setAttribute("stroke-width", "1.5");
			path.setAttribute("stroke-linecap", "round");
			path.setAttribute("stroke-linejoin", "round");

			icon.appendChild(path);

			const nameLink = document.createElement('a');
			nameLink.href = file.name;
			nameLink.textContent = file.name;

			const nameSpan = document.createElement('span');
			nameSpan.className = 'file-name';
			nameSpan.appendChild(icon);
			nameSpan.appendChild(nameLink);

			const sizeSpan = document.createElement('span');
			sizeSpan.className = 'file-size';
			sizeSpan.textContent = file.size;

			const shaButtonSpan = document.createElement('span');
			shaButtonSpan.className = 'file-sha';
			const shaButton = document.createElement('button');
			shaButton.className = 'copy-button';
			shaButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/></svg>';
			shaButton.dataset.sha256Values = "";
			shaButton.addEventListener('click', async () => {
				navigator.clipboard.writeText(shaButton.dataset.sha256Values).then(() => {
					shaButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/></svg>';
					// 创建并显示复制成功的提示
					const successMessage = document.createElement('div');
					successMessage.className = 'copy-success';
					successMessage.textContent = '复制成功!';
					document.body.appendChild(successMessage);

					// 设置提示的位置
					const rect = shaButton.getBoundingClientRect();
					successMessage.style.top = (rect.bottom - 30).toString() + "px";
					successMessage.style.left = (rect.right + 10).toString() + "px";
					setTimeout(() => {
						successMessage.classList.add('fade-out');
						successMessage.addEventListener('transitionend', () => {
							document.body.removeChild(successMessage);
						});
						setTimeout(() => {
							shaButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/></svg>';
						}, 1500);
					}, 500);
				}).catch(err => {
					console.error('Failed to copy text: ', err);
					// 创建并显示复制失败的提示
					const successMessage = document.createElement('div');
					successMessage.className = 'copy-success';
					successMessage.textContent = '复制失败!';
					document.body.appendChild(successMessage);

					// 设置提示的位置
					const rect = shaButton.getBoundingClientRect();
					successMessage.style.top = (rect.bottom - 30).toString() + "px";
					successMessage.style.left = (rect.right + 10).toString() + "px";
					setTimeout(() => {
						successMessage.classList.add('fade-out');
						successMessage.addEventListener('transitionend', () => {
							document.body.removeChild(successMessage);
						});
						setTimeout(() => {
							shaButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/></svg>';
						}, 1500);
					}, 500);
				});
			});

			shaButtonSpan.appendChild(shaButton);

			li.appendChild(nameSpan);
			li.appendChild(sizeSpan);
			li.appendChild(shaButtonSpan);
			container.appendChild(li);
			shaButton.dataset.sha256Values = await fetchFileSHA256("https://raw.githubusercontent.com/KodateMitsuru/customrepo/refs/heads/main/" + file.name);
			sizeSpan.textContent = await fetchFileSize(file.name);
		});
	}

	function navInEvent (event) {
		if (!event.relatedTarget || !document.querySelector('.navbar').contains(event.relatedTarget)){
			const menuItems = document.querySelectorAll('.navbar a');
			for (const menuItem of menuItems) {
				menuItem.style.display = "block";
				menuItem.style.animation = 'slideIn 0.3s forwards';
			}
		}
	}

	function navOutEvent (event) {
		if (!event.relatedTarget || !document.querySelector('.navbar').contains(event.relatedTarget)) {
			const menuItems = document.querySelectorAll('.navbar a');
			for (const menuItem of menuItems) {
				menuItem.style.animation = 'slideOut 0.15s forwards';
				setTimeout(()=>{menuItem.style.display = "none";},150);
			}
		}
	}

	function renderMenu () {
		const navbar = document.querySelector('.navbar');
		if (window.innerWidth <= 600){
			const menuItems = document.querySelectorAll('.navbar a');
			for (const menuItem of menuItems) {
				menuItem.style.display = "none";
			}
			navbar.addEventListener("mouseover", navInEvent);
			navbar.addEventListener("mouseout", navOutEvent);
		} else {
			navbar.removeEventListener("mouseover", navInEvent);
			navbar.removeEventListener("mouseout", navOutEvent);
			const menuItems = document.querySelectorAll('.navbar a');
			for (const menuItem of menuItems) {
				menuItem.style.display = "block";
				menuItem.style.animation = '';
			}
		}
	}
	swup.hooks.on('content:replace', async () => { 
		await renderFileList();
		renderMenu();
	 });
	document.addEventListener('DOMContentLoaded', async () => {
		await renderFileList();
		renderMenu();
	});
	window.addEventListener('resize', function() {
		renderMenu();
	});
</script>
`
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
	const text = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="" xml:lang="">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
    <title>404 Not Found (Ｔ▽Ｔ)</title>
    <link href="https://blog.kodatemitsuru.com/favicon/avatar.png" rel="icon" sizes="32x32">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/jez/pandoc-markdown-css-theme/public/css/theme.css" />
    <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/jez/pandoc-markdown-css-theme/public/css/skylighting-solarized-theme.css" />
    <style type="text/css">
		body {
			background-image: url('https://s2.loli.net/2025/01/16/LsPzykvcarbxpiK.webp'); 
			background-size: cover; 
			background-position: center; 
			background-repeat: no-repeat; 
			background-attachment: fixed;
		}

        .navbar {
			left: 50%; /* 水平居中 */
			transform: translateX(-50%); /* 水平居中 */
			overflow: hidden;
			background-color: #333;
			position: fixed;
			top: 20px; /* 距离顶部20px */
			width: (80%); /* 自动宽度 */
			padding: 10px 20px; /* 内边距 */
			border-radius: 15px; /* 圆角 */
			box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* 阴影 */
			z-index: 1000;
			min-width: 483px;
		}
	
		.navbar a {
			float: left;
			display: block;
			color: #f2f2f2;
			text-align: center;
			padding: 14px 16px;
			border: none;
			transition: all 0.3s ease-in-out; /* 添加过渡效果 */
			text-decoration: none;
			position: relative; /* 相对定位 */
			overflow: hidden; /* 隐藏溢出部分 */
		}

		.navbar a:hover {
			color: black;
		}

		.navbar a::before {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: 0;
			height: 0;
			background-color: #f8f8f8;
			border-radius: 15px;
			transform: translate(-50%, -50%);
			transition: all 0.3s ease-in-out;
			z-index: -1; /* 确保背景在文字下方 */
		}
	
		.navbar a:hover::before {
			width: 90%;
			height: 90%;
		}

		.navbar .toggle-menu{
			display:none;
			color: #f2f2f2;
			text-align: center;
			padding: 14px 16px;
			border: none;
			transition: all 0.3s ease-in-out; /* 添加过渡效果 */
			text-decoration: none;
			position: relative; /* 相对定位 */
			overflow: hidden; /* 隐藏溢出部分 */
			cursor: pointer;
		}

		.navbar .toggle-menu:hover {
			color: black;
		}

		.navbar .toggle-menu::before {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: 0;
			height: 0;
			background-color: #f8f8f8;
			border-radius: 15px;
			transform: translate(-50%, -50%);
			transition: all 0.3s ease-in-out;
			z-index: -1; /* 确保背景在文字下方 */
		}

		.navbar .toggle-menu:hover::before {
			width: 90%;
			height: 90%;
		}

        code {
            background: var(--solarized-base3);
            /* border: 1px solid var(--solarized-base2); */
            --color-code-highlight-bg: var(--solarized-base2);
            border: 0;
        }

        code span.sharp {
            color: var(--solarized-base01);
            font-weight: normal;
            font-style: normal;
        }

		/* Define a transition duration during page visits */
		html.is-changing .transition-fade {
			transition: opacity 0.25s;
			opacity: 1;
		}
		/* Define the styles for the unloaded pages */
		html.is-animating .transition-fade {
			opacity: 0;
		}

		.rounded-container {
            margin: 20px auto 40px auto;
			border: 1px solid #ccc;
            border-radius: 15px;
            padding: 20px;
			max-width: 970px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
			background-color: rgba(255, 255, 255, 0.8);
			backdrop-filter: blur(10px);
        }

		@media (max-width: 1030px) {
            .rounded-container {
				max-width: calc(100% - 60px);
            }
        }
		@media (max-width: 600px) {
			.navbar a {
				display: none;
				flex-direction: column;
				width: 100%;
                text-align: center;
                padding: 10px 0;
			}

			.navbar {
				min-width: 200px;
				padding: 10px 5px; /* 内边距 */
				flex-direction: column;
				transition: all 0.5s ease-in-out;
			}

			.navbar .toggle-menu{
				display:block;
			}
		}
		@keyframes slideIn {
			from {
				opacity: 0;
				transform: translateY(-10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
		@keyframes slideOut {
			from {
				opacity: 1;
				transform: translateY(0);
			}
			to {
				opacity: 0;
				transform: translateY(-10px);
			}
		}
			
    </style>
</head>

<body>
    <div id="menu" class="navbar" data-swup-preload-all>
		<span class="toggle-menu">Kodate's Arch repo</span>
		<a href="/home" >Home</a>
		<a href="/packages" >Packages</a>
		<a href="https://github.com/KodateMitsuru/customrepo" target="_blank" class="github-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            GitHub
        </a>
		<a href="https://www.archlinux.org" target="_blank">
			<svg width="16" height="16" viewBox="0 -10 36 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
				<path fill-rule="evenodd" d="M 16.843 -4.392 C 15.489 -1.079 14.676 1.092 13.171 4.311 C 14.093 5.29 15.228 6.431 17.067 7.717 C 15.088 6.899 13.739 6.082 12.728 5.233 C 10.801 9.259 7.78 14.983 1.655 25.993 C 6.473 23.212 10.202 21.498 13.681 20.842 C 13.535 20.201 13.447 19.509 13.452 18.779 L 13.457 18.628 C 13.535 15.539 15.139 13.17 17.04 13.331 C 18.941 13.492 20.42 16.123 20.347 19.211 C 20.331 19.789 20.264 20.346 20.149 20.867 C 23.592 21.539 27.284 23.247 32.034 25.992 C 31.096 24.268 30.263 22.711 29.461 21.232 C 28.206 20.258 26.893 18.987 24.221 17.612 C 26.06 18.091 27.372 18.643 28.398 19.258 C 20.278 4.149 19.627 2.138 16.841 -4.393 L 16.843 -4.392 Z"></path>
			</svg>
			Arch Linux
		</a>
	</div>

    <main id="swup" class="transition-fade rounded-container">
        <h1 id="404">404 Not Found</h1>
        <h2>什么都没找到QAQ</h2>
        <p>可能是输错路径了？</p>
        <p>不管如何，请返回首页吧↓</p>
        <a href="/home" id="backtohome">← 返回首页</a>
${scriptText}
    </main>

</body>

</html>
`
	return text ;
}

async function home() {
	const text = `
	<!DOCTYPE html>
	<html xmlns="http://www.w3.org/1999/xhtml" lang="" xml:lang="">
	
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
		<title>Kodate's Archlinux repo</title>
		<link href="https://blog.kodatemitsuru.com/favicon/avatar.png" rel="icon" sizes="32x32">
		<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/jez/pandoc-markdown-css-theme/public/css/theme.css" />
		<link rel="stylesheet"
			href="https://cdn.jsdelivr.net/gh/jez/pandoc-markdown-css-theme/public/css/skylighting-solarized-theme.css" />
		<style type="text/css">
			body {
				background-image: url('https://s2.loli.net/2025/01/16/LsPzykvcarbxpiK.webp'); 
				background-size: cover; 
				background-position: center; 
				background-repeat: no-repeat; 
				background-attachment: fixed;
			}

			.navbar {
				left: 50%; /* 水平居中 */
				transform: translateX(-50%); /* 水平居中 */
				overflow: hidden;
				background-color: #333;
				position: fixed;
				top: 20px; /* 距离顶部20px */
				width: (80%); /* 自动宽度 */
				padding: 10px 20px; /* 内边距 */
				border-radius: 15px; /* 圆角 */
				box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* 阴影 */
				z-index: 1000;
				min-width: 483px;
			}
		
			.navbar a {
				float: left;
				display: block;
				color: #f2f2f2;
				text-align: center;
				padding: 14px 16px;
				border: none;
				transition: all 0.3s ease-in-out; /* 添加过渡效果 */
				text-decoration: none;
				position: relative; /* 相对定位 */
				overflow: hidden; /* 隐藏溢出部分 */
			}
	
			.navbar a:hover {
				color: black;
			}
	
			.navbar a::before {
				content: '';
				position: absolute;
				top: 50%;
				left: 50%;
				width: 0;
				height: 0;
				background-color: #f8f8f8;
				border-radius: 15px;
				transform: translate(-50%, -50%);
				transition: all 0.3s ease-in-out;
				z-index: -1; /* 确保背景在文字下方 */
			}
		
			.navbar a:hover::before {
				width: 90%;
				height: 90%;
			}

			.navbar .toggle-menu{
				display:none;
				color: #f2f2f2;
				text-align: center;
				padding: 14px 16px;
				border: none;
				transition: all 0.3s ease-in-out; /* 添加过渡效果 */
				text-decoration: none;
				position: relative; /* 相对定位 */
				overflow: hidden; /* 隐藏溢出部分 */
				cursor: pointer;
			}

			.navbar .toggle-menu:hover {
				color: black;
			}

			.navbar .toggle-menu::before {
				content: '';
				position: absolute;
				top: 50%;
				left: 50%;
				width: 0;
				height: 0;
				background-color: #f8f8f8;
				border-radius: 15px;
				transform: translate(-50%, -50%);
				transition: all 0.3s ease-in-out;
				z-index: -1; /* 确保背景在文字下方 */
			}

			.navbar .toggle-menu:hover::before {
				width: 90%;
				height: 90%;
			}
	
			code {
				background: var(--solarized-base3);
				/* border: 1px solid var(--solarized-base2); */
				--color-code-highlight-bg: var(--solarized-base2);
				border: 0;
				word-break:break-word;
			}
	
			code span.sharp {
				color: var(--solarized-base01);
				font-weight: normal;
				font-style: normal;
			}

			/* Define a transition duration during page visits */
			html.is-changing .transition-fade {
				transition: opacity 0.25s;
				opacity: 1;
			}
			/* Define the styles for the unloaded pages */
			html.is-animating .transition-fade {
				opacity: 0;
			}

			.rounded-container {
				margin: 20px auto 40px auto;
				border: 1px solid #ccc;
				border-radius: 15px;
				padding: 20px;
				max-width: 970px;
				box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
				background-color: rgba(255, 255, 255, 0.8);
				backdrop-filter: blur(10px);
			}
	
			@media (max-width: 1030px) {
				.rounded-container {
					max-width: calc(100% - 60px);
				}
			}
			@media (max-width: 600px) {
				.navbar a {
					display: none;
					flex-direction: column;
					animation: slideIn 0.3s forwards;
					width: 100%;
					text-align: center;
					padding: 10px 0;
				}
	
				.navbar {
					min-width: 200px;
					padding: 10px 5px; /* 内边距 */
					flex-direction: column;
					transition: all 0.5s ease-in-out;
				}
	
				.navbar .toggle-menu{
					display:block;
				}
			}
			@keyframes slideIn {
				from {
					opacity: 0;
					transform: translateY(-10px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
			@keyframes slideOut {
				from {
					opacity: 1;
					transform: translateY(0);
				}
				to {
					opacity: 0;
					transform: translateY(-10px);
				}
			}
		</style>
	</head>
	
	<body>
		<div class="navbar" data-swup-preload-all>
			<span class="toggle-menu">Kodate's Arch repo</span>
			<a href="/home">Home</a>
			<a href="/packages">Packages</a>
			<a href="https://github.com/KodateMitsuru/customrepo" target="_blank" class="github-link">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
					<path fill-rule="evenodd"
						d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z">
					</path>
				</svg>
				GitHub
			</a>
			<a href="https://www.archlinux.org" target="_blank">
				<svg width="16" height="16" viewBox="0 -10 36 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
					<path fill-rule="evenodd"
						d="M 16.843 -4.392 C 15.489 -1.079 14.676 1.092 13.171 4.311 C 14.093 5.29 15.228 6.431 17.067 7.717 C 15.088 6.899 13.739 6.082 12.728 5.233 C 10.801 9.259 7.78 14.983 1.655 25.993 C 6.473 23.212 10.202 21.498 13.681 20.842 C 13.535 20.201 13.447 19.509 13.452 18.779 L 13.457 18.628 C 13.535 15.539 15.139 13.17 17.04 13.331 C 18.941 13.492 20.42 16.123 20.347 19.211 C 20.331 19.789 20.264 20.346 20.149 20.867 C 23.592 21.539 27.284 23.247 32.034 25.992 C 31.096 24.268 30.263 22.711 29.461 21.232 C 28.206 20.258 26.893 18.987 24.221 17.612 C 26.06 18.091 27.372 18.643 28.398 19.258 C 20.278 4.149 19.627 2.138 16.841 -4.393 L 16.843 -4.392 Z">
					</path>
				</svg>
				Arch Linux
			</a>
		</div>
	
		<main id="swup" class="transition-fade  rounded-container">
			<h1 id="kodates-personal-repo">Kodate’s personal repo</h1>
			<h2 id="简介">简介</h2>
			<p>个人自用repo</p>
			<p>为zenver4设备编译，不保证兼容性</p>
			<h2 id="使用">使用</h2>
			<h3 id="首先导入我的公钥">首先导入我的公钥</h3>
			<div class="sourceCode">
				<pre
					class="numberSource"><code class="sourceCode"><span><a></a><span class="sharp">#</span> <span class="fu">pacman-key</span> <span class="at">--recv-key</span> E151220F46DB0A0C7B00D6763116E5A7034F3373 <span class="at">--keyserver</span> keyserver.ubuntu.com</span>
	<span><a tabindex="-1"></a><span class="sharp">#</span> <span class="fu">pacman-key</span> <span class="at">--lsign-key</span> E151220F46DB0A0C7B00D6763116E5A7034F3373</span></code></pre>
			</div>
			<h3 id="然后添加repo">然后添加repo</h3>
			<p>在 <code><span class="fu">/etc/pacman.conf</span></code> 中添加</p>
			<div class="sourceCode">
				<pre
					class="numberSource"><code class="sourceCode"><span><a></a><span class="kw">[custom]</span></span>
	<span><a></a><span class="dt">Server</span> <span class="op">=</span> <span class="dt">https://repo.kodatemitsuru.com</span></span></code></pre>
			</div>
			<h2 id="软件包">软件包</h2>
			<p>主要是一些自用的包，还有一些ros2的自编译包</p>
			<p>
				<a href="#" >↑ Back to the top</a>
			</p>
${scriptText}
		</main>
	</body>
	
	</html>
`
	return text ;
}

async function packages() {
	const text = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="" xml:lang="">

<head>
	<meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
	<title>Kodate's Archlinux repo</title>
	<link href="https://blog.kodatemitsuru.com/favicon/avatar.png" rel="icon" sizes="32x32">
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/jez/pandoc-markdown-css-theme/public/css/theme.css" />
	<link rel="stylesheet"
		href="https://cdn.jsdelivr.net/gh/jez/pandoc-markdown-css-theme/public/css/skylighting-solarized-theme.css" />
	<style type="text/css">
		body {
            background-image: url('https://s2.loli.net/2025/01/16/LsPzykvcarbxpiK.webp'); 
            background-size: cover; 
            background-position: center; 
            background-repeat: no-repeat; 
			background-attachment: fixed;
        }

		.navbar {
			left: 50%; /* 水平居中 */
			transform: translateX(-50%); /* 水平居中 */
			overflow: hidden;
			background-color: #333;
			position: fixed;
			top: 20px; /* 距离顶部20px */
			width: (80%); /* 自动宽度 */
			padding: 10px 20px; /* 内边距 */
			border-radius: 15px; /* 圆角 */
			box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* 阴影 */
			z-index: 1000;
			min-width: 483px;
		}
	
		.navbar a {
			float: left;
			display: block;
			color: #f2f2f2;
			text-align: center;
			padding: 14px 16px;
			border: none;
			transition: all 0.3s ease-in-out; /* 添加过渡效果 */
			text-decoration: none;
			position: relative; /* 相对定位 */
			overflow: hidden; /* 隐藏溢出部分 */
		}

		.navbar a:hover {
			color: black;
		}

		.navbar a::before {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: 0;
			height: 0;
			background-color: #f8f8f8;
			border-radius: 15px;
			transform: translate(-50%, -50%);
			transition: all 0.3s ease-in-out;
			z-index: -1; /* 确保背景在文字下方 */
		}
	
		.navbar a:hover::before {
			width: 90%;
			height: 90%;
		}

		.navbar .toggle-menu{
			display:none;
			color: #f2f2f2;
			text-align: center;
			padding: 14px 16px;
			border: none;
			transition: all 0.3s ease-in-out; /* 添加过渡效果 */
			text-decoration: none;
			position: relative; /* 相对定位 */
			overflow: hidden; /* 隐藏溢出部分 */
			cursor: pointer;
		}

		.navbar .toggle-menu:hover {
			color: black;
		}

		.navbar .toggle-menu::before {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: 0;
			height: 0;
			background-color: #f8f8f8;
			border-radius: 15px;
			transform: translate(-50%, -50%);
			transition: all 0.3s ease-in-out;
			z-index: -1; /* 确保背景在文字下方 */
		}

		.navbar .toggle-menu:hover::before {
			width: 90%;
			height: 90%;
		}

		.file-list-container {
			width: 80%;
			margin: 0 auto;
			border: 1px solid #ccc;
            border-radius: 15px;
			overflow: hidden;
		}

		.file-list-item {
			display: flex;
			justify-content: space-between;
			padding: 10px;
			border-bottom: 1px solid #eee;
			overflow: hidden;
		}

		.file-name {
			flex: 4;
			text-align: left;
		}

		.file-size {
			flex: 2;
			text-align: right;
		}

		.file-sha {
			flex: 1;
			text-align: right;
		}

		.file-list-item:nth-child(odd) {
			background-color: rgba(249, 249, 249, 0.2);
			backdrop-filter: blur(4px);
		}

		.file-list-item:nth-child(even) {
			background-color: rgba(255, 255, 255, 0.2);
		}

		.file-list-item span {
			display: inline-block;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.file-list-item a {
			text-decoration: none;
			color: inherit;
		}

		.file-list-item a:hover {
			color: #FFA500;
			text-decoration: underline;
		}

		.file-icon {
			width: 16px;
			height: 16px;
			margin-right: 10px;
			position: relative;
			top: 2px;
		}

		.copy-button {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
        }

        .copy-button svg {
            width: 16px;
            height: 16px;
        }

		.copy-success {
			position: absolute;
			background-color: black;
			color: white;
			padding: 5px 10px;
			border-radius: 3px;
			font-size: 12px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
			z-index: 1001;
			transition: opacity 0.5s ease-out;
		}
		
		.copy-success.fade-out {
			opacity: 0;
		}

		/* Define a transition duration during page visits */
		html.is-changing .transition-fade {
			transition: opacity 0.25s;
			opacity: 1;
		}
		/* Define the styles for the unloaded pages */
		html.is-animating .transition-fade {
			opacity: 0;
		}
			
		.rounded-container {
            margin: 20px auto 40px auto;
			border: 1px solid #ccc;
            border-radius: 15px;
            padding: 20px;
			max-width: 970px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
			background-color: rgba(255, 255, 255, 0.8);
			backdrop-filter: blur(10px);
        }

		@media (max-width: 1030px) {
            .rounded-container {
				max-width: calc(100% - 60px);
            }
        }
		@media (max-width: 600px) {
			.navbar a {
				display: none;
				flex-direction: column;
				animation: slideIn 0.3s forwards;
				width: 100%;
                text-align: center;
                padding: 10px 0;
			}

			.navbar {
				min-width: 200px;
				padding: 10px 5px; /* 内边距 */
				flex-direction: column;
				transition: all 0.5s ease-in-out;
			}

			.navbar .toggle-menu{
				display:block;
			}
		}
		@keyframes slideIn {
			from {
				opacity: 0;
				transform: translateY(-10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
		@keyframes slideOut {
			from {
				opacity: 1;
				transform: translateY(0);
			}
			to {
				opacity: 0;
				transform: translateY(-10px);
			}
		}

	</style>
</head>

<body>
	<div class="navbar" data-swup-preload-all>
		<span class="toggle-menu">Kodate's Arch repo</span>
		<a href="home" >Home</a>
		<a href="packages" >Packages</a>
		<a href="https://github.com/KodateMitsuru/customrepo" target="_blank" class="github-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            GitHub
        </a>
		<a href="https://www.archlinux.org" target="_blank">
			<svg width="16" height="16" viewBox="0 -10 36 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
				<path fill-rule="evenodd" d="M 16.843 -4.392 C 15.489 -1.079 14.676 1.092 13.171 4.311 C 14.093 5.29 15.228 6.431 17.067 7.717 C 15.088 6.899 13.739 6.082 12.728 5.233 C 10.801 9.259 7.78 14.983 1.655 25.993 C 6.473 23.212 10.202 21.498 13.681 20.842 C 13.535 20.201 13.447 19.509 13.452 18.779 L 13.457 18.628 C 13.535 15.539 15.139 13.17 17.04 13.331 C 18.941 13.492 20.42 16.123 20.347 19.211 C 20.331 19.789 20.264 20.346 20.149 20.867 C 23.592 21.539 27.284 23.247 32.034 25.992 C 31.096 24.268 30.263 22.711 29.461 21.232 C 28.206 20.258 26.893 18.987 24.221 17.612 C 26.06 18.091 27.372 18.643 28.398 19.258 C 20.278 4.149 19.627 2.138 16.841 -4.393 L 16.843 -4.392 Z"></path>
			</svg>
			Arch Linux
		</a>
	</div>

	<main id="swup" class="transition-fade rounded-container">
		<h1>Package List</h1>
		<div id="file-list-container"></div>
		<p>
			<a href="#">↑ Back to the top</a>
		</p>
${scriptText}
	</main>

</body>

</html>
`
	return text ;
}