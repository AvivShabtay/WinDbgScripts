/***************************************************************************************
    Format handles information and provide methods to get the data.
    
    See Volatility handles command for reference:
    https://github.com/volatilityfoundation/volatility/wiki/Command-Reference#handles
***************************************************************************************/

/**
    Get handle and return string representation of it's object name.

    Parameters:
        handle - WinDbg handle object
*/
function __getObjectNameFormat(handle)
{
    if(handle.Type == "Process")
    {
        const eprocessObject = handle.Object.UnderlyingObject;
        const processImageFileNameAddress = eprocessObject.ImageFileName.targetLocation.address;
        const processImageFileName = host.memory.readString(eprocessObject.ImageFileName.targetLocation.address);
        const processId = eprocessObject.UniqueProcessId.address;
        return `${processImageFileName.toString()}(${parseInt(processId)})`;
    }
    else if(handle.Type.includes("Thread"))
    {
        const ethreadObject = handle.Object.UnderlyingObject;
        const tid = ethreadObject.Cid.UniqueThread;
        const pid = ethreadObject.Cid.UniqueProcess;
        return `TID ${parseInt(tid.address)} PID ${parseInt(pid.address)}`;
    }
    else if(handle.Type.includes("File"))
    {
        const fileObject = handle.Object.UnderlyingObject;
        return `${fileObject.FileName}`;
    }
    else if(handle.Type.includes("ALPC Port"))
    {
        const objectHeader = handle.Object;
        return objectHeader.ObjectName ? `${objectHeader.ObjectName}` : "";
    }
    else
    {
        return "";
    }
}

/**
    Get handle and return it's virtual address.

    Parameters:
        handle - WinDbg handle object
*/
function __getHandleOffset(handle)
{
    const kernelObject = handle.Object;
    if(kernelObject)
    {
        return kernelObject.targetLocation.address;
    }
    else
    {
        return "";
    }
}

/**
    Get process and return the following information for each of it's handles:
        Offset - the virtual address of the underlining object
        Pid - the process ID
        Handle - the handle index
        Access - not available yet
        Type - the underlining object type
        Details - string representing the underlining object

    Parameters:
        process - WinDbg process object.

    Example how to get WinDbg process:
        dx @$process = @$curprocess.Process.Where( filter to get intersting process).First()`

    Example of to use this function:
        dx -g Debugger.State.Scripts.handles.Contents.getProcessHandles(@$process)
*/
function handles(process)
{
    const processHandles = process.Io.Handles;
    const currentProcessId = parseInt(process.Id.toString());
    
    let handlesInFormat = [];

    for(const handle of processHandles)
    {

        const objectNameInFormat = __getObjectNameFormat(handle);
        const objectOffset = __getHandleOffset(handle);

        let tempHandleInFormat = 
        {
            Offset: objectOffset,
            Pid: currentProcessId,
            Handle: handle.Handle,
            //Access: h.GrantedAccess,
            Type: handle.Type,
            Details: objectNameInFormat
        };

        handlesInFormat.push(tempHandleInFormat);
    }

    return handlesInFormat;
}

/**
    Return the handles information for the current process under the debugger.
    See getProcessHandles documentation for more information.
*/
function currentProcessHandles()
{
    return handles(host.currentProcess);
}