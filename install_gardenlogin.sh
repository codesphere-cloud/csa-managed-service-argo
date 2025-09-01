#!/usr/bin/bash

$KUBECTL_GL=/home/user/app/bin/kubectl-gardenlogin

mkdir -p ./bin

# Check if already run
if [ -f "$KUBECTL_GL" ]; then
    echo "gardenlogin already exists in ./bin directory. Exit script..."
    exit
fi

os=linux # choose between darwin, linux, windows
arch=amd64

# Get latest version. Alternatively set your desired version
version=$(curl -s https://raw.githubusercontent.com/gardener/gardenlogin/master/LATEST)

# Download gardenlogin
curl -LO "https://github.com/gardener/gardenlogin/releases/download/${version}/gardenlogin_${os}_${arch}"

# Make the gardenlogin binary executable
chmod +x "./gardenlogin_${os}_${arch}"

# Move the binary
mv "./gardenlogin_${os}_${arch}" ./bin/gardenlogin

# create kubectl-gardenlogin symlink
ln -s /home/user/app/bin/gardenlogin /home/user/app/bin/kubectl-gardenlogin