# Publishing Guide

This guide explains how to publish the MCP ACS Process Manager extension to the VS Code Marketplace.

## Prerequisites

1. **VS Code Account**: Create a publisher account at <https://marketplace.visualstudio.com/manage>
2. **Personal Access Token**: Generate a PAT from Azure DevOps
3. **vsce**: Install the VS Code Extension Manager CLI tool

```bash
npm install -g @vscode/vsce
```

## Step 1: Create Publisher Account

1. Go to <https://marketplace.visualstudio.com/manage>
2. Sign in with your Microsoft account
3. Click "Create publisher"
4. Fill in the details:
   - **Publisher ID**: `DigitalDefiance` (must match package.json)
   - **Display Name**: Digital Defiance
   - **Description**: AI Capabilities Suite
5. Click "Create"

## Step 2: Generate Personal Access Token

1. Go to <https://dev.azure.com/>
2. Click on your profile → Security
3. Click "Personal access tokens"
4. Click "New Token"
5. Configure:
   - **Name**: VS Code Marketplace
   - **Organization**: All accessible organizations
   - **Expiration**: 90 days (or custom)
   - **Scopes**: Custom defined
     - **Marketplace**: Acquire, Manage
6. Click "Create"
7. **Copy the token** (you won't see it again!)

## Step 3: Login to vsce

```bash
vsce login DigitalDefiance
```

Enter your Personal Access Token when prompted.

## Step 4: Prepare for Publishing

### Update Version

Update version in `package.json`:

```json
{
  "version": "1.0.0"
}
```

### Update CHANGELOG

Add release notes to `CHANGELOG.md`:

```markdown
## [1.0.0] - 2024-12-04

### Added

- Initial release
- Process management features
- Security boundaries visualization
```

### Create Icon

Create a 128x128 PNG icon and save it as `images/icon.png`.

### Test the Extension

1. Compile the extension:

   ```bash
   npm run compile
   ```

2. Test in VS Code:

   - Press F5 to launch Extension Development Host
   - Test all features
   - Check for errors in Output panel

3. Run tests:

   ```bash
   npm test
   ```

### Verify Package Contents

Check what will be included in the package:

```bash
vsce ls
```

Verify:

- All necessary files are included
- No sensitive files (tokens, keys, etc.)
- No unnecessary files (node_modules, .git, etc.)

## Step 5: Package the Extension

Create a `.vsix` file:

```bash
vsce package
```

This creates `mcp-process-manager-1.0.0.vsix`.

### Test the Package

Install the package locally:

```bash
code --install-extension mcp-process-manager-1.0.0.vsix
```

Test thoroughly:

1. Restart VS Code
2. Test all features
3. Check for errors
4. Verify icon and branding
5. Test on different platforms if possible

## Step 6: Publish to Marketplace

### Option A: Publish with vsce

```bash
vsce publish
```

This will:

1. Package the extension
2. Upload to marketplace
3. Make it available immediately

### Option B: Publish Specific Version

```bash
vsce publish 1.0.0
```

### Option C: Publish Pre-release

```bash
vsce publish --pre-release
```

## Step 7: Verify Publication

1. Go to <https://marketplace.visualstudio.com/items?itemName=DigitalDefiance.mcp-process-manager>
2. Verify:

   - Extension appears correctly
   - Icon is displayed
   - Description is correct
   - Screenshots are visible (if added)
   - README is formatted correctly
   - Version number is correct

3. Install from marketplace:

   ```bash
   code --install-extension DigitalDefiance.mcp-process-manager
   ```

4. Test the installed extension

## Step 8: Post-Publication

### Update Repository

1. Tag the release:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Create GitHub release:
   - Go to GitHub repository
   - Click "Releases" → "Create a new release"
   - Select tag `v1.0.0`
   - Add release notes from CHANGELOG
   - Attach `.vsix` file
   - Publish release

### Announce Release

1. Update main README with marketplace link
2. Post on social media
3. Update documentation
4. Notify users

## Publishing Updates

### Patch Release (1.0.0 → 1.0.1)

```bash
vsce publish patch
```

### Minor Release (1.0.0 → 1.1.0)

```bash
vsce publish minor
```

### Major Release (1.0.0 → 2.0.0)

```bash
vsce publish major
```

## Unpublishing

To remove an extension from the marketplace:

```bash
vsce unpublish DigitalDefiance.mcp-process-manager
```

**Warning**: This is permanent and cannot be undone!

## Troubleshooting

### "Publisher not found"

**Solution**: Verify publisher ID matches package.json:

```json
{
  "publisher": "DigitalDefiance"
}
```

### "Personal Access Token is invalid"

**Solution**:

1. Generate new token
2. Login again: `vsce login DigitalDefiance`

### "Extension validation failed"

**Solution**: Check for:

- Missing required fields in package.json
- Invalid icon path
- Broken links in README
- Invalid version number

### "Package too large"

**Solution**:

1. Check `.vscodeignore` excludes unnecessary files
2. Remove large dependencies
3. Use `vsce ls` to see what's included

### "README images not showing"

**Solution**:

- Use absolute URLs for images
- Host images on GitHub or CDN
- Don't use relative paths

## Best Practices

1. **Semantic Versioning**: Follow semver (MAJOR.MINOR.PATCH)
2. **Changelog**: Always update CHANGELOG.md
3. **Testing**: Test thoroughly before publishing
4. **Documentation**: Keep README up to date
5. **Icon**: Use high-quality 128x128 PNG
6. **Screenshots**: Add screenshots to README
7. **Keywords**: Use relevant keywords in package.json
8. **License**: Include LICENSE file
9. **Repository**: Link to GitHub repository
10. **Support**: Provide support channels

## Marketplace Guidelines

Follow VS Code Marketplace guidelines:

1. **Content**: No offensive or inappropriate content
2. **Functionality**: Extension must work as described
3. **Performance**: Don't slow down VS Code
4. **Security**: No malicious code or data collection without consent
5. **Branding**: Don't impersonate Microsoft or VS Code
6. **Licensing**: Respect licenses of dependencies

## Continuous Deployment

### GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Extension

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Compile
        run: npm run compile

      - name: Publish to Marketplace
        run: npx vsce publish -p ${{ secrets.VSCE_TOKEN }}
```

Add `VSCE_TOKEN` secret to GitHub repository settings.

## Resources

- [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
