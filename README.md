# WinDbg Scripts

Useful WinDbg Javascript scripts for exploring and researching Windows.

Some of the scripts motivated from Volatility framework plugins.

## Tools
* handles - Show handles information for given process.

## Examples

### handles
Example of running the script
```JS
// Find process you want to inspect
dx @$interestingProcess = @$cursession.Processes.Where( p => p.Name.Contains("System")).First()

// Load the handle.js script
.scriptload <full path to handle.js>

// Get handle for the process
dx @$handles = Debugger.State.Scripts.handles.Contents
dx -g @$handles.getProcessHandles(@$interestingProcess)
```

Example of result output:
```
=======================================================================================================
=                         = Offset                = Pid    = Handle  = Type         = Details         =
=======================================================================================================
= [0x0] : [object Object] - 0xffff820ef8a7d040    - 0x4    - 0x4     - Process      - System(4)       =
= [0x1] : [object Object] - 0xffff820ef8bc1140    - 0x4    - 0x8     - Thread       - TID 28 PID 4    =
= [0x2] : [object Object] -                       - 0x4    - 0xc     - Key          -                 =
= [0x3] : [object Object] - 0xffff820ef8a756e0    - 0x4    - 0x10    - Mutant       -                 =
= [0x4] : [object Object] - 0xffffa0868ec373c0    - 0x4    - 0x14    - Directory    -                 =
= [0x5] : [object Object] - 0xffffa0868ec166f0    - 0x4    - 0x18    - Directory    -                 =
= [0x6] : [object Object] -                       - 0x4    - 0x1c    - Partition    -                 =
= [0x7] : [object Object] - 0xffffa0868ec168c0    - 0x4    - 0x20    - Directory    -                 =
= [0x8] : [object Object] - 0xffff820ef8a91820    - 0x4    - 0x24    - Event        -                 =
=======================================================================================================
```