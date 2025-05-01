#!/bin/bash

# 清理旧的构建文件
rm -rf dist
rm -f *.zip

# 构建前端项目
cd ../frontend
npm run build

# 创建dist目录
cd ../extension
mkdir -p dist/assets
mkdir -p dist/icons

# 复制manifest.json
cp manifest.json dist/

# 复制图标
cp icons/* dist/icons/

# 复制前端构建文件
cp -r ../frontend/dist/* dist/

# 复制扩展特定的文件
cp ../frontend/src/extension/background.js dist/assets/
cp ../frontend/src/extension/content.js dist/assets/
cp ../frontend/src/extension/csrf.js dist/assets/

# 重命名文件以匹配预期的文件名
cd dist/assets
for file in *-*.*; do
  if [ -f "$file" ]; then
    newname=$(echo "$file" | sed -E 's/-[a-zA-Z0-9]+\./\./g')
    mv "$file" "$newname"
  fi
done

# 确保关键文件存在
required_files=("background.js" "content.js" "main.js" "main.css")
for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "错误: 缺少必需文件 $file"
    exit 1
  fi
done

# 回到扩展目录
cd ../..

# 打包扩展
version=$(grep '"version"' manifest.json | cut -d'"' -f4)
zip -r "kxianjunshi-extension-v${version}.zip" dist/ 