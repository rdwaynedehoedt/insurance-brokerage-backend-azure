# Regenerating Your Azure Storage Key

Since the Azure Storage key was previously exposed in a commit, you need to regenerate it to maintain security.

## Steps to Regenerate Your Azure Storage Key

1. **Login to the Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your credentials

2. **Navigate to Your Storage Account**
   - Search for "Storage accounts" in the search bar
   - Select your storage account (insurancedocuments)

3. **Regenerate the Storage Key**
   - In the left menu, under "Security + networking," select "Access keys"
   - Click the "Regenerate" button next to "key1" or "key2" (whichever was exposed)
   - Copy the new key

4. **Update Your Local Environment**
   - Edit your local `.env` file with the new connection string:
   ```
   AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=insurancedocuments;AccountKey=NEW_KEY_HERE;EndpointSuffix=core.windows.net
   ```

5. **Update Azure App Service Configuration (if deployed)**
   - In the Azure Portal, navigate to your App Service
   - Go to Configuration → Application settings
   - Update the AZURE_STORAGE_CONNECTION_STRING value

## Handling the GitHub Push Error

GitHub is blocking your push because it detected the exposed key in a previous commit. To handle this:

1. **Allow the Secret in GitHub**
   - Follow the link provided in the error message:
   - https://github.com/rdwaynedehoedt/insurance-brokerage-backend-azure/security/secret-scanning/unblock-secret/2xATokOU2UK2dRMWnpL17On8PfG
   - Select "I have rotated this secret and want to allow this specific version"
   - This tells GitHub you acknowledge the exposure and have created a new key

2. **Push Your Code**
   - After allowing the secret, you should be able to push your code

## Prevention for the Future

- Never include actual secrets in script files like `update_env.js`
- Always use `.env` files for local development (which are in `.gitignore`)
- Consider using Azure Key Vault for production applications
- Run `git config --global --add secrets.patterns '(AccountKey=[^;^"^\\s]+)'` to add a pre-commit hook that catches Azure storage keys 