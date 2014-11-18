var Class			= require('../GCL_NodeJs/Inheritance.js').Class;
var net 			= require('net');
var colors 			= require('colors');
var Logger			= require('../GCL_NodeJs/Logger.js').Logger;
var	CmdLineManager	= require('../GCL_NodeJs/CmdLineManager.js').CmdLineManager;
var JSON			= require('JSON');

var	SlaveManager 	=
{
	_slaves			: [],
	
	Add				: function(socket)
	{
		var id = this._slaves.length;
		this._slaves[id] = socket;
		return id;
	},
	RemoveBySocket	: function(socket)
	{
		var index = this._slaves.indexOf(socket);
		if (index === -1)
			return;
		this._slaves.splice(index, 1);
	},
	RemoveById	: function(id)
	{
		this._slaves.splice(id, 1);
	},
	GetSocketById	: function(id)
	{
		return this._slaves[id];
	},
	GetIdBySocket	: function(socket)
	{
		return this._slaves.indexOf(socket);
	},
	GetSlaves		: function()
	{
		return this._slaves;
	}
};
var SlaveManagerInstance = SlaveManager;

// [Todo] : Move to GCL
function 	CreateDelegate(func, target)
{
    return function() { 
        return func.apply(target, arguments);
    };
}

function	GetSocketDump(socket)
{
	var adress = socket.address();
	return 'Local : [' + adress.port + ', ' + adress.family + ', ' + adress.address + '], Remote : [' + socket.remoteAddress.green + ']';
}

var Master = Class.extend(// Runnable.extend(
{
	initialize				: function()
	{
		this.InitializeCmdManager();
		this.InitializeServer();
	},
	InitializeServer		: function()
	{
		this._server = net.createServer(function(c) { //'connection' listener
		
			var id = SlaveManagerInstance.Add(c);
			Logger.writeFor('server', 'Slave [' + id + '] connected : ' + GetSocketDump(c));
			var rdChunk = "";
			c.on('end', function() {
				Logger.writeFor('client', 'Slave disconnected : [' + SlaveManagerInstance.GetIdBySocket(c) + ']');
				SlaveManagerInstance.RemoveBySocket(c);
			});
			c.on('error', function() {
				Logger.writeFor('client', 'error signal emitted for : [' + SlaveManagerInstance.GetIdBySocket(c) + ']');
				SlaveManagerInstance.RemoveBySocket(c);
			});
			c.on('data', function(data) {
				rdChunk += data;
				if (rdChunk.length >= 2 && rdChunk.substr(rdChunk.length -2, 2) == "\r\n")
				{
					rdChunk = rdChunk.substr(0, rdChunk.length -2);
					Logger.writeFor('Server::OnData', 'data from [' + SlaveManagerInstance.GetIdBySocket(c) + ']: [' + rdChunk + ']');
					rdChunk = "";
				}
			});
		});
		this._server.on('error', function(error) {
			Logger.writeFor('Server::OnError', 'error close emitted : [' + error.red + ']');
		});
		this._server.on('close', function() {
			Logger.writeFor('Server::OnClose', 'close emitted');
		});
		this._server.listen(4242, function() {
		  Logger.writeFor('server', 'Master server is ready');
		});
	},
	InitializeCmdManager	: function()
	{
		// Helps
		CmdLineManager.InsertHelp("ls",   	"Alias of list");
		CmdLineManager.InsertHelp("list", 	"List active slaves. Add a slave ID to get a particular slave description");
		CmdLineManager.InsertHelp("kick", 	"Kick a speccific slave");
		CmdLineManager.InsertHelp("kill", 	"Alias of kick");
		CmdLineManager.InsertHelp("send", 	"Send a msg to a specific slave");
	    CmdLineManager.InsertHelp("msg",  	"alias of send");
	    CmdLineManager.InsertHelp("help", 	"display help. If an ID is provided, display help of a specific cmd");
		CmdLineManager.InsertHelp("?", 		"Alias of help");
		
		// Cmds
		CmdLineManager.Insert("ls", 	CreateDelegate(this.ListSlaves, 		this));
		CmdLineManager.Insert("list", 	CreateDelegate(this.ListSlaves, 		this));
		CmdLineManager.Insert("kick", 	CreateDelegate(this.KickSlave, 			this));
		CmdLineManager.Insert("kill", 	CreateDelegate(this.KickSlave, 			this));
		CmdLineManager.Insert("send", 	CreateDelegate(this.SendDatasToSlave, 	this));
		CmdLineManager.Insert("msg", 	CreateDelegate(this.SendDatasToSlave, 	this));
		CmdLineManager.Insert("help", 	function(){
			
			if (arguments[0] !== undefined)
			{
				var help = CmdLineManager.GetHelp(arguments[0]);
				Logger.writeFor("CmdLineManager::help", (help === null ? "Unknown cmd" : help));
				return;
			}
			
			var cmds = "";
			for (var p in CmdLineManager._cmds)
				cmds += p + ", ";
			Logger.writeFor("CmdLineManager", "Available commands".yellow + " : [" + (cmds == "" ? cmds : cmds.substr(0, cmds.length - 2)) + "]");
		});
		CmdLineManager.Insert("?", CmdLineManager.Get("help"));
	},
	ListSlaves				: function()
	{
		if (arguments[0] !== undefined)
		{
			Logger.writeFor("CmdLineManager::help::ListSlave",
							"\n|- " + arguments[0] + " => "
								+ (SlaveManagerInstance._slaves[arguments[0]] === undefined ? "Dos not exist" : GetSocketDump(SlaveManagerInstance._slaves[arguments[0]])));
			return;
		}
	
		Logger.write("Listing slaves (".yellow + SlaveManagerInstance._slaves.length + ")".yellow);
		for (var i = 0; i < SlaveManagerInstance._slaves.length; ++i)
			Logger.write("\t|- " + i + " => " + GetSocketDump(SlaveManagerInstance._slaves[i]));
	},
	KickSlave				: function(slaveId)
	{
		Logger.write("Kick slave (".yellow + SlaveManagerInstance._slaves.length + ")".yellow);
		
		var socket = SlaveManagerInstance.GetSocketById(slaveId);
		socket.end();
		// SlaveManagerInstance.RemoveById(slaveId); // Replaced by client_socket.on('end')_
	},
	SendDatasToSlave		: function(args)
	{
		Logger.write("SendDatasToSlave (".yellow + SlaveManagerInstance._slaves.length + ")".yellow);
		var socket = SlaveManagerInstance.GetSocketById(args[0]);
		if (typeof(socket) == "undefined")
		{
			Logger.writeFor("Error", "That client does not exist : [" + args[0] + "]");
			return;
		}
		var data = "";
		for (var i = 1; i < args.length; ++i)
			data += (i != 1 ?  ' ' + args[i] : args[i]);
		Logger.write("writing to [" + args[0] + "] : [" + data + "]");
		socket.write(data + "\r\n");	// Hard-coded EOL marker : "\r\n"
	}
});

Logger.writeFor("Master", "About to start");

process.on('uncaughtException', function(ex) {
    Logger.writeFor("Error::Uncaught_exeception", "[" + (ex + '').red + ']');
});
var MasterInstance = new Master();
CmdLineManager.StartRecordingInputs();

Logger.writeFor("Master", "Started");

