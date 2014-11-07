var Class			= require('../NodeJS_GCL/Inheritance.js').Class;
var Runnable		= require('../NodeJS_GCL/Runnable.js').Base;
var net 			= require('net');
var colors 			= require('colors');



function	Log(log)
{
	console.log("[+]".bold.grey.inverse + " : " + log);
}
function	LogFor(token, log)
{
	console.log("[+]".bold.grey.inverse + "::[" + token.green + "] : " + log);
}


var CmdManager = Class.extend(
{
	_cmds 	: {},
	
	Insert	: function(key, value)
	{
		this._cmds[key] = value;
	},
	Remove	: function(key)
	{
		// [Todo]
	},
	Get	: function(key)
	{
		if (key in this._cmds)
			return this._cmds[key];
		return null;
	}
});

var CmdManagerInstance = new CmdManager();

var	Slave			= function(id, socket)
{
	_id = id,
	_socket = socket,
	_ip = null
};
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
function CreateDelegate(func, target)
{
    return function() { 
        return func.apply(target, arguments);
    };
}


var Master = Class.extend(// Runnable.extend(
{
	initialize			: function()
	{
		this.InitializeCmdManager();
		this.InitializeServer();
		this._cbCallBack = this.Logic;
	},
	Logic				: function()
	{
		// console.log("Master::Logic : Called");
	},
	InitializeServer		: function()
	{
		this._server = net.createServer(function(c) { //'connection' listener
			LogFor('server', 'Slave connected : [' +  SlaveManagerInstance.Add(c) + ']');
			var rdChunk = "";
			c.on('end', function() {
				LogFor('server', 'Slave disconnected');
				SlaveManagerInstance.RemoveBySocket(c);
			});
			c.on('data', function(data) {
				rdChunk += data;
				if (data == '\n')
				{
					data.substr(0, data.length - 1);
					LogFor('server', 'data from [' + SlaveManagerInstance.GetIdBySocket(c) + ']: [' + data + ']');
				}
			});
			
			// [todo] : on : close, timeout
			
			c.write('Hello slave\r\n');
			// c.pipe(c);
		});
		this._server.listen(4242, function() {
		  LogFor('server', 'Master server is ready');
		});
	},
	InitializeCmdManager	: function()
	{
		// CmdManagerInstance.Insert("quit", 			CreateDelegate(this.Stop, 		this));
		// CmdManagerInstance.Insert("stop", 			CreateDelegate(this.Stop, 		this));
		// CmdManagerInstance.Insert("start", 			CreateDelegate(this.DebugStart, this));
		CmdManagerInstance.Insert("list_slaves", 	CreateDelegate(this.ListSlaves, this));
		CmdManagerInstance.Insert("kick_slave", 	CreateDelegate(this.KickSlave, this));
		CmdManagerInstance.Insert("send_slave", 	CreateDelegate(this.SendDatasToSlave, this));
		// [Todo] : send datas to a specific slave
	},
	ListSlaves				: function()
	{
		Log("Listing slaves (".yellow + SlaveManagerInstance._slaves.length + ")".yellow);
		for (var i = 0; i < SlaveManagerInstance._slaves.length; ++i)
			Log("\t|- " + i + " => " + SlaveManagerInstance._slaves[i]);
	},
	KickSlave				: function(slaveId)
	{
		Log("Kick slave (".yellow + SlaveManagerInstance._slaves.length + ")".yellow);
		
		var socket = SlaveManagerInstance.GetSocketById(slaveId);
		socket.end();
		// SlaveManagerInstance.RemoveById(slaveId);
	},
	SendDatasToSlave		: function(args)
	{
		Log("SendDatasToSlave (".yellow + SlaveManagerInstance._slaves.length + ")".yellow);
		var socket = SlaveManagerInstance.GetSocketById(args[0]);
		var data = "";
		for (var i = 1; i < args.length; ++i)
			data += (i != 1 ?  ' ' + args[i] : args[i]);
		Log("writing to [" + args[0] + "] : [" + data + "]");
		socket.write(data);
	}
	// DebugStart				: function()
	// {
		// this.StartTimedCall(1000);
	// }
});


// CmdManager.Insert("list slaves", )

Log("[+] Master script started");

var MasterInstance = new Master();

// Initialize commande line input :
process.stdin.setEncoding('utf8');
process.stdin.on('readable', function()
{
	var chunk = process.stdin.read();
	if (chunk !== null)
	{
		if (chunk.length < 3) return;
		chunk = chunk.substr(0, chunk.length - 2);	// On retire le "\r\n"
		
		// todo : Une commande est forcement 1 mot [+args]
		var split 	= chunk.split(" ");
		var cmd 	= split[0];
		var args 	= split;
		args.splice(0,1);
		
		Log("Inout cmd : [" + cmd.green + "] with args : [" + args.toString() + "]");
		var cb = CmdManagerInstance.Get(cmd);
		if (cb === null)
			Log("Unknown cmd");
		else
		{
			if (split.length === 1)
				cb();
			else
			{
				;
				cb(args);
			}
		}
	}
});



Log("Master is ready to start");

