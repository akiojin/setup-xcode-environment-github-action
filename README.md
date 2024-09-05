# setup-xcode-environment-github-action

![Build][0]

This action installs the provisioning profile and certificate required to build Xcode.
Provisioning profiles and certificates are installed automatically using [fastlane][1], so there is no need to set a Base64-ized file for the secret.
This action does not automatically remove installed provisioning profiles and certificates.
If you do not want to keep the provisioning profile and certificates, use a temporary keychain instead of the default keychain.
Certificates are stored in the keychain configured by default, but a temporary keychain can also be used.
See [Usage temporary keychain](#usage-temporary-keychain) for instructions on using the temporary keychain.

## Requirement

### fastlane

You will need to install [fastlane][1].
Only Git repositories are supported for storing provisioning profiles and certificates.

#### Installation

```sh
brew install fastlane
```

#### Configuration

- Git repository for storing provisioning profiles and certificates
- Provisioning profiles and certificates must have been previously stored in the above repositories by `fastlane match`.

## Usage

### Simple usage

```yml
- uses: akiojin/setup-xcode-environment-github-action@v2
  with:
    type: 'development'
    app-identifier: com.exmple.App
    team-id: ABC0123456
    git-url: 'https://github.com/certificates'
    git-passphase: ${{ secrets.APPLE_CERTIFICATE_GIT_PASSPHASE }}
```

### Usage temporary keychain

```yml
- usas: setup-temporary-keychain-github-action@v1
  id: setup-temporary-keychain

- uses: akiojin/setup-xcode-environment-github-action@v2
  id: setup-xcode-environment
  with:
    type: 'enterprise'
    app-identifier: com.exmple.App
    team-id: ABC0123456
    git-url: 'https://github.com/certificates'
    git-passphase: ${{ secrets.APPLE_CERTIFICATE_GIT_PASSPHASE }}
    keychain: ${{ steps.setup-temporary-keychain.outputs.keychain }}
    keychain-password: ${{ steps.setup-temporary-keychain.outputs.keychain-password }}
```

## Arguments

|        Name         | Required |   Type   | Default |                                                                                                    Description                                                                                                    |
| :------------------ | :------- | :------- | :------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`              | `true`   | `string` |         | Define the profile type, can be `appstore`, `adhoc`, `development`, `enterprise`, `developer_id`, mac_installer_distribution.                                                                                     |
| `app-identifier`    | `true`   | `string` |         | The bundle identifier(s) of your app (comma-separated string or array of strings).                                                                                                                                |
| `team-id`           | `true`   | `string` |         | The ID of your Developer Portal team if you're in multiple teams.                                                                                                                                                 |
| `git-url`           | `true`   | `string` |         | URL to the git repo containing all the certificates.                                                                                                                                                              |
| `git-passphrase`    | `true`   | `string` |         | When running match for the first time on a new machine, it will ask you for the passphrase for the Git repository.<br>This is an additional layer of security: each of the files will be encrypted using openssl. |
| `git-branch`        | `false`  | `string` | `main`  | Specific git branch to use.                                                                                                                                                                                       |
| `keychain`          | `false`  | `string` | ""      | Path of the keychain to use. If omitted, the default login keychain is used.                                                                                                                                      |
| `keychain-password` | `false`  | `string` | ""      | Password for the keychain if specified in the keychain parameter;<br>default login keychain password if the kerchain parameter is omitted.                                                                        |

## Environment

If this action succeeds, the following parameters will be set to values.

|      Environment variable name       |         Description          |
| ------------------------------------ | ---------------------------- |
| `APPLE_PROV_PROFILE`                 | Provisioning profile path    |
| `APPLE_PROV_PROFILE_UUID`            | UUID of provisioning profile |
| `APPLE_PROV_PROFILE_NAME`            | Provisioning profile name    |
| `APPLE_CERTIFICATE_SIGNING_IDENTITY` | credentials                  |

|Output paramater name| Description|
|---|---|
| `apple-prov-profile`                 | Provisioning profile path    |
| `apple-prov-profile-uuid`            | UUID of provisioning profile |
| `apple-prov-profile-name`            | Provisioning profile name    |
| `apple-certificate-signing-identity` | credentials                  |

## License

Any contributions made under this project will be governed by the [MIT License][3].

[0]: https://github.com/akiojin/setup-xcode-environment-github-action/actions/workflows/Build.yml/badge.svg
[1]: https://docs.fastlane.tools/
[2]: https://github.com/akiojin/setup-xcode-environment-github-action/blob/main/action.yml
[3]: https://github.com/akiojin/setup-xcode-environment-github-action/blob/main/LICENSE