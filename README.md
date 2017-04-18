Odd Networks API Client
=======================
An Odd Networks admin API client in Node.js. Manage your account, channel, and content using the Odd Networks API from your command line.

Installation
------------
You'll need to [download Node.js](https://nodejs.org/en/) if you don't have it on your machine.

Once you have Node.js installed, run this command in the terminal:

```
npm install -g odd-api-client-node
```

The `-g` flag will tell npm to install the client globally so you can have access to it anywhere on your machine.

Usage
-----
Once installed globally run it anywhere with

```
odd-cli
```

That will prompt to you export an environment variable called `ODD_BASE_URL`.

```
The ODD_BASE_URL env variable is required. Ex: https://api.oddnetworks.com/api/v1
```

You can do that with the export command (on Mac or Linux):

```
export ODD_BASE_URL=http://localhost:3000/api/v1
```

### Commands
Get help any time with

```
odd-cli --help
```

### api-token
Get help with

```
odd-cli api-token --help
```

Generate an API JWT token for a user with `--username` and `--password`.

### load
Get help with

```
odd-cli load --help
```

The `odd-api load` command will take a file or folder as `--source` input and create or update all the contained JSON objects using the API. The load command will attempt to POST each JSON document to the server using the API. If the API responds with a conflict error, then the load command will use a PATCH request on the next attempt.

__!WARNING__ If your JSON documents do not have an ID (other than Platform documents who's ID is automatically generated), then duplicates will be created rather than updating existing documents.

#### update-property
Get help with

```
odd-cli update-property --help
```

Create or update a new user, account, and channel all at once.

```
odd-cli update-property --source /path/to/mychannel/jsonfiles/
```

The `--source` directory must be in a specific format:

```
/-
  |- user/
  | `- user.json
  |- account/
  | `- account.json
  |- channel/
  | `- channel.json
  `- content/
    |- provider/
    |- platform/
    `- view/
```

Check out the [example files](tree/master/examples/example-property-files) to see how to structure your data files. Note that every file requires an "id" attribute, except the `platform` files.

`odd-cli update-property` will first create the user if it does not already exist, and then login the user. Secondly it will create or update the account and channel objects. Lastly it will recurse through the `content/` directory and create or update all objects it finds there represented as JSON files.


License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)
