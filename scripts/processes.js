/***************************************************************************************
    Format processes information and provide methods to get the data.
    
    See Volatility pslist command for reference.
***************************************************************************************/

function getPPid(process)
{
    const eprocessObject = process.KernelObject;
    return eprocessObject.OwnerProcessId;
}

function getNumberOfThreads(process)
{
    const eprocessObject = process.KernelObject;
    return eprocessObject.NumberOfThreads;
}

function getProcessName(process)
{
    return process.Name;
}

function getProcessOffset(process)
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

function getNumberOfHandles(process)
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

function getSessionId(process)
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

function processList()
{
    const processes = host.currentSession.Processes;

    let processList = [];

    for(const process of processes)
    {
        const eprocessOffset = getProcessOffset(process);
        const processName = getProcessName(process);
        const processId = parseInt(process.Id.toString());
        const parentProcessId = parseInt(getPPid(process));
        const threadsCount = parseInt(getNumberOfThreads(process));
        const handlesCount = getNumberOfHandles(process);
        const sessionId = getSessionId(process);

        let processInFormat = 
        {
            Offset: eprocessOffset,
            Name: processName,
            PID: processId,
            PPID: parentProcessId,
            Thds: threadsCount,
            Hnds: handlesCount,
            Sess: sessionId
        };

        processList.push(processInFormat);
    }

    return processList;
}