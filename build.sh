#!/bin/bash

# 创建 dist 目录
rm -rf dist
mkdir -p dist

# 复制必要文件到 dist 目录
cp -r public/* dist/
cp src/popup.js dist/
cp src/background.js dist/
cp src/content.js dist/
cp src/csrf.js dist/
cp -r styles dist/

# 复制 manifest.json
cp manifest.json dist/

# 如果使用了 node_modules 中的依赖，也需要复制
# cp -r node_modules dist/

# 压缩成 zip 文件
cd dist
zip -r ../kxianjunshi-extension.zip *
cd ..

echo "打包完成！文件位于 kxianjunshi-extension.zip" 