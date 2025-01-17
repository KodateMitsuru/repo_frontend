const fs = require("node:fs");
const path = require("node:path");
const { minify } = require("html-minifier");

// 获取 src 目录下所有 .html 文件
const rootDir = path.join(__dirname, "../");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const srcFiles = fs
	.readdirSync(srcDir)
	.filter((file) => file.endsWith(".html"));

const htmlFiles = srcFiles.filter((file) => file.endsWith(".html"));
let templateContent = fs.readFileSync(
	path.join(srcDir, "template.js"),
	"utf8",
);

// 确保 dist 目录存在
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// 处理每个 HTML 文件
for (const filename of htmlFiles) {
	console.log(`正在处理 ${filename} 文件`);
	const variableName = `${path.basename(filename, ".html")}Text`;
	const filePath = path.join(srcDir, filename);
	let fileContent = fs.readFileSync(filePath, "utf8");

	fileContent = minify(fileContent, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyCSS: true,
        minifyJS: true,
    });


	// 将 filenameContent 嵌入到 index.js 中的对应变量
	const regex = new RegExp(`const ${variableName} = \"[\\s\\S]*?\"`);
	templateContent = templateContent.replace(
		regex,
		`const ${variableName} = \`${fileContent}\``,
	);
}

// 将更新后的内容写回 index.js 文件
fs.writeFileSync(path.join(distDir, "index.js"), templateContent);

console.log('所有 HTML 文件内容已嵌入到 index.js 中');
