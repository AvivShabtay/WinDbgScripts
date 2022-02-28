/**********************************************************************
    Author: Aviv Shabtay

    Dump ALPC endpoints.

    Credit to @zer0mem - http://www.zer0mem.sk/?p=542
**********************************************************************/

function print(x) {
    host.diagnostics.debugLog(x);
}

function println(x) {
    print(x);
    host.diagnostics.debugLog("\n");
}

/**
    https://stackoverflow.com/a/17252151
*/
String.prototype.padding = function(n, c) {
    var val = this.valueOf();
    
    if ( Math.abs(n) <= val.length ) {
            return val;
    }

    var m = Math.max((Math.abs(n) - this.length) || 0, 0);
    var pad = Array(m + 1).join(String(c || ' ').charAt(0));
    return (n < 0) ? pad + val : val + pad;
};

/**
    DX command:
    dx -g Debugger.Utility.Collections.FromListEntry(*(nt!_LIST_ENTRY*)&nt!PsActiveProcessHead, "nt!_EPROCESS", "ActiveProcessLinks")
*/
function* __eprocessGenerator() {
    const psActiveProcessHeadSymbolAddress = host.getModuleSymbolAddress("nt", "PsActiveProcessHead");
    const pPsActiveProcessList = host.createTypedObject(psActiveProcessHeadSymbolAddress, "nt", "_LIST_ENTRY");
    const processesIterator = host.namespace.Debugger.Utility.Collections.FromListEntry(pPsActiveProcessList, "nt!_EPROCESS", "ActiveProcessLinks");

    for(const eprocess of processesIterator) 
    {
        yield eprocess;
    }
}

/**
    DX command:
    dx -g Debugger.Utility.Collections.FromListEntry(*(nt!_LIST_ENTRY*)&nt!AlpcpPortList, "nt!_ALPC_PORT", "PortListEntry")
*/
function* __alpcGenerator() {
    const aplcPortListSymbolAddress = host.getModuleSymbolAddress("nt", "AlpcpPortList");
    const aplcPortListSymbolValue =  host.Int64(host.memory.readMemoryValues(aplcPortListSymbolAddress,1 ,8)[0]);
    const alpcPortListEntryObject = host.createTypedObject(aplcPortListSymbolValue, "nt", "_LIST_ENTRY");
    const aplcPortListEntryIterator = host.namespace.Debugger.Utility.Collections.FromListEntry(alpcPortListEntryObject, "nt!_ALPC_PORT", "PortListEntry");
    
    for(const alpcPort of aplcPortListEntryIterator)
    {
        yield alpcPort;
    }
}

function displayAlpcConnections() {
    const PADDING = 20;
    println("Server Port Info".padding(PADDING+1) + "<-> Connection Port Info");

    const eprocesses = __eprocessGenerator();

    for(const eprocess of eprocesses) {

        const eprocessAddress = eprocess.targetLocation.address;
        const eprocessImageFilename = host.memory.readString(eprocess.ImageFileName.targetLocation.address)

        const alpces = __alpcGenerator();
        for(const alpc of alpces) {

            const alpcOwnerProcessAddress = alpc.OwnerProcess.address;

            if(eprocessAddress == alpcOwnerProcessAddress) {
                try {

                    const alpcOwnerProcessId = alpc.OwnerProcess.UniqueProcessId.address;
                    const alpcOwnerProcessImageFilename = host.memory.readString(alpc.OwnerProcess.ImageFileName.targetLocation.address);
                    const alpcPortOnwerProcessId = alpc.CommunicationInfo.ConnectionPort.OwnerProcess.UniqueProcessId.address;
                    const alpcPortOnwerProcessImageFilename = host.memory.readString(alpc.CommunicationInfo.ConnectionPort.OwnerProcess.ImageFileName.targetLocation.address);

                    print(`${alpcOwnerProcessImageFilename} (${alpcOwnerProcessId})`.padding(PADDING));
                    print(" <- ".padding(5));
                    println(`${alpcPortOnwerProcessId} (${alpcPortOnwerProcessImageFilename})`);
                
                } catch(exception) {
                    // do nothing 
                }
            }
        }
    }
}
