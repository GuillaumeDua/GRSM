var Class			= require('../GCL_NodeJs/Inheritance.js').Class;
var net 			= require('net');
var colors 			= require('colors');
var Logger			= require('../GCL_NodeJs/Logger.js').Logger;
var	CmdLineManager	= require('../GCL_NodeJs/CmdLineManager.js').CmdLineManager;

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
				Logger.writeFor('server', 'Slave disconnected : [' + SlaveManagerInstance.GetIdBySocket(c) + ']');
				SlaveManagerInstance.RemoveBySocket(c);
			});
			c.on('data', function(data) {
				if (data == "\r\n")
				{
					Logger.writeFor('server', 'data from [' + SlaveManagerInstance.GetIdBySocket(c) + ']: [' + rdChunk + ']');
					rdChunk = "";
				}
				else rdChunk += data;
			});
			
			// [Todo] : on : close, timeout -> crash
			// c.write('Hello slave\r\n');
			// c.pipe(c);
		});
		this._server.listen(4242, function() {
		  Logger.writeFor('server', 'Master server is ready');
		});
	},
	InitializeCmdManager	: function()
	{
		// CmdLineManager.Insert("quit", 			CreateDelegate(this.Stop, 		this));
		// CmdLineManager.Insert("stop", 			CreateDelegate(this.Stop, 		this));
		// CmdLineManager.Insert("start", 			CreateDelegate(this.DebugStart, this));
		CmdLineManager.Insert("list_slaves", 	CreateDelegate(this.ListSlaves, this));
		CmdLineManager.Insert("kick_slave", 	CreateDelegate(this.KickSlave, this));
		CmdLineManager.Insert("send_slave", 	CreateDelegate(this.SendDatasToSlave, this));
	},
	ListSlaves				: function()
	{
		Logger.write("Listing slaves (".yellow + SlaveManagerInstance._slaves.length + ")".yellow);
		for (var i = 0; i < SlaveManagerInstance._slaves.length; ++i)
			Logger.write("\t|- " + i + " => " + GetSocketDump(SlaveManagerInstance._slaves[i]));
	},
	KickSlave				: function(slaveId)
	{
		Logger.write("Kick slave (".yellow + SlaveManagerInstance._slaves.length + ")".yellow);
		
		var socket = SlaveManagerInstance.GetSocketById(slaveId);
		socket.end();
		SlaveManagerInstance.RemoveById(slaveId);
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

var MasterInstance = new Master();
CmdLineManager.StartRecordingInputs();

Logger.writeFor("Master", "Started");

