var Class			= require('../GCL_NodeJs/Inheritance.js').Class;
var net 			= require('net');
var colors 			= require('colors');
var Logger			= require('../GCL_NodeJs/Logger.js').Logger;
var	CmdLineManager	= require('../GCL_NodeJs/CmdLineManager.js').CmdLineManager;
var exec 			= require('child_process').exec;

// [Todo] : Move to GCL
function 	CreateDelegate(func, target)
{
    return function() { 
        return func.apply(target, arguments);
    };
}


var Slave = Class.extend(
{
	_socket : null,
	
	initialize				: function()
	{
		this.InitializeCmdManager();
		// this.Connect();
	},
	Connect					: function()
	{
		this._socket = new net.Socket();
		// this._socket.connect(4242, "127.0.0.1", function());
	},
	socket_onData			: function()
	{
		// cmd
		// CmdLineManager
		// si CmdLineManager.get(cmd) == null execute en tant que commande shell
	},
	InitializeCmdManager	: function()
	{
		CmdLineManager.Insert("cmd", 	CreateDelegate(this.ExecuteCmd, 	this));
		CmdLineManager.Insert("script", CreateDelegate(this.ExecuteScript, 	this));
	},
	ExecuteScript			: function(cmd, script)
	{
		// write script to file
		// Execute cmd with arg == script_path
	},
	ExecuteCmd				: function(args)
	{
		var cmd = "";
		for (var i = 0; i < args.length; ++i)
			cmd += (i != 0 ?  ' ' + args[i] : args[i]);
		// Logger.writeFor("Slave::ExecuteCmd", 'cmd is : [' + cmd + ']');
		var child = exec(	cmd,
							function (error, stdout, stderr)
							{
								Logger.writeFor("Slave::ExecuteCmd", 'stdout : [' + stdout + ']');
								if (stderr.length != 0) Logger.writeFor("Slave::ExecuteCmd", 'stderr : [' + stderr + ']');
								if (error !== null)
									Logger.writeFor("Slave::ExecuteCmd", 'error: [' + error + ']');
								});
	}
});


Logger.writeFor("Slave", "About to start");

var SlaveInstance = new Slave();
CmdLineManager.StartRecordingInputs(); // For debug only. Then, cmd will be socket's read datas

Logger.writeFor("Slave", "Started");
