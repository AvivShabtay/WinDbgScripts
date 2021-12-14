/***************************************************************************************
    Format processes information and provide methods to get the data.
    
    See Volatility pslist command for reference.
***************************************************************************************/

/**
    Return the parent PID from a given process.

    Parameters:
    process - WinDbg process object.
*/
function __getPPid(process)
{
    const eprocessObject = process.KernelObject;
    return eprocessObject.OwnerProcessId;
}

/**
    Return the number of thread of a given process.

    Parameters:
    process - WinDbg process object.
*/
function __getNumberOfThreads(process)
{
    const eprocessObject = process.KernelObject;
    return eprocessObject.NumberOfThreads;
}

/**
    Return the name of a given process.

    Parameters:
    process - WinDbg process object.
*/
function __getProcessName(process)
{
    return process.Name;
}

/**
    Return the virtual address of a given process.

    Parameters:
    process - WinDbg process object.
*/
function __getProcessOffset(process)
{
    const eprocessObject = process.KernelObject;
    if(eprocessObject)
    {
        return eprocessObject.targetLocation.address;
    }
    else
    {
        return "";
    }
}

/**
    Return the number of handles of a given process.

    Parameters:
    process - WinDbg process object.
*/
function __getNumberOfHandles(process)
{
    try
    {
        return process.Io.Handles.Count();
    }
    catch(e)
    {
        return "------";
    }
}

/**
    Return the session ID of a given process.

    Parameters:
    process - WinDbg process object.
*/
function __getSessionId(process)
{
    try
    {
        if(process.KernelObject.Session)
        {
            return process.KernelObject.Session.SessionId;
        }
        else
        {
            return "------";
        }
    }
    catch(e)
    {
        return "------";
    }
}

/**
    Return indication whether a given process is Wow64 process.

    Parameters:
    process - WinDbg process object.
*/
function __isWow64Process(process)
{
    const woW64ProcessStructureAddress = process.KernelObject.WoW64Process.targetLocation.address;
    const woW64ProcessStructureNumber = parseInt(woW64ProcessStructureAddress, 16);
    
    if(woW64ProcessStructureNumber === 0)
    {
        return 0;
    }
    else
    {
        return 1;
    }
}

/**
    Return Unix timestamp value from Windows timestamp value.

    Parameters:
    windowsTimestamp - Integer representing Windows timestamp.
*/
function __convertWindowsTimestampToUnixTime(windowsTimestamp)
{
    /* https://stackoverflow.com/a/51054901 */

    const windowsTicks = 10000000;
    const epochTime = 11644473600;

    const unixTimestamp = windowsTimestamp / windowsTicks - epochTime;
    
    return unixTimestamp;
}

/**
    Return date time string from a given date object.

    Parameters:
    dateObject - Date object.
*/
function __formatTimestamp(data)
{
    const zeroFilled = (num, length) => 
    { 
        return ('0'.repeat(length) + num).slice(-2); 
    }

    const twoZeroFilled = (num) => 
    { 
        return zeroFilled(num, 2);
    }

    // yyyy-mm-dd hh:MM:ss
    const formatCreateTime =    `${data.getFullYear()}-` + 
                                `${twoZeroFilled(data.getMonth())}-` + 
                                `${twoZeroFilled(data.getDate())} ` +
                                `${twoZeroFilled(data.getHours())}:` +
                                `${twoZeroFilled(data.getMinutes())}:` +
                                `${twoZeroFilled(data.getSeconds())}`;
    
    return formatCreateTime;
}

/**
    Return string representing the process start time.

    Parameters:
    process - WinDbg process object.
*/
function __getProcessStartTime(process)
{
    const createTimeAddress = process.KernelObject.CreateTime.targetLocation.address;
    const createTimeObject = host.createTypedObject(createTimeAddress, host.getModuleType("nt", "_LARGE_INTEGER")).QuadPart;
    const createTimeNumber = parseInt(createTimeObject, 16);

    const unixCreateTime = __convertWindowsTimestampToUnixTime(createTimeNumber);
    const createTimeDate = new Date(unixCreateTime * 1000);

    return __formatTimestamp(createTimeDate);
}

/**
    Return string representing the process exit time.

    Parameters:
    process - WinDbg process object.
*/
function __getProcessExitTime(process)
{
    const exitTimeAddress = process.KernelObject.ExitTime.targetLocation.address;
    const exitTimeObject = host.createTypedObject(exitTimeAddress, host.getModuleType("nt", "_LARGE_INTEGER")).QuadPart;
    const exitTimeNumber = parseInt(exitTimeObject, 16);

    if(exitTimeNumber === 0)
    {
        return "";
    }

    const unixExitTime = __convertWindowsTimestampToUnixTime(exitTimeNumber);
    const exitTimeDate = new Date(unixExitTime * 1000);

    return __formatTimestamp(exitTimeDate);
}

/**
    List all available processes with useful information.
*/
function pslist()
{
    const processes = host.currentSession.Processes;

    let processList = [];

    for(const process of processes)
    {
        const eprocessOffset = __getProcessOffset(process);
        const processName = __getProcessName(process);
        const processId = parseInt(process.Id.toString());
        const parentProcessId = parseInt(__getPPid(process));
        const threadsCount = parseInt(__getNumberOfThreads(process));
        const handlesCount = __getNumberOfHandles(process);
        const sessionId = __getSessionId(process);
        const wow64Process = __isWow64Process(process);
        const startTime = __getProcessStartTime(process);
        const exitTime = __getProcessExitTime(process);

        let processInFormat = 
        {
            Offset: eprocessOffset,
            Name: processName,
            PID: processId,
            PPID: parentProcessId,
            Thds: threadsCount,
            Hnds: handlesCount,
            Sess: sessionId,
            Wow64: wow64Process,
            Start: startTime,
            Exit: exitTime
        };

        processList.push(processInFormat);
    }

    return processList;
}