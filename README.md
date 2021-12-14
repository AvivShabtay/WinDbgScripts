# WinDbg Scripts

Useful WinDbg Javascript scripts for exploring and researching Windows.

Some of the scripts motivated from Volatility framework plugins.

## Tools
* handles - Show handles information for given process
* pslist - Shot all available processes with details

## Examples

### handles
Usage:
```JS
// Find process you want to inspect
dx @$interestingProcess = @$cursession.Processes.Where( p => p.Name.Contains("System")).First()

// Load the handle.js script
.scriptload <full path to handle.js>

// Get handle for the process
dx @$handles = Debugger.State.Scripts.handles.Contents
dx -g @$handles.getProcessHandles(@$interestingProcess)
```

Output:
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

### pslist (process list)
Usage:
```JS
// Load the processes.js script
.scriptload <full path to processes.js>

// List all processes
dx @$processes = Debugger.State.Scripts.processes.Contents
dx -g @$processes.pslist()
```

Output:
```
=================================================================================================================================================================================
=         = Offset                = Name                  = PID       = PPID      = Thds    = Hnds      = Sess      = Wow64  = Start                  = Exit                   =
=================================================================================================================================================================================
= [0x0]  - 0xfffff8030c124a00    - Idle                   - 0x0       - 0x0       - 0x0     - 0x1187    - ------    - 0x0    - 2021-11-08 14:07:31    -                        =
= [0x1]  - 0xffff820ef8a7d040    - System                 - 0x4       - 0x2       - 0xb2    - 0x1187    - ------    - 0x0    - 2021-11-08 14:07:31    -                        =
= [0x2]  - 0xffff820ef8ac7080    - Registry               - 0x7c      - 0x6       - 0x4     - 0x0       - ------    - 0x0    - 2021-11-08 14:07:29    -                        =
= [0x3]  - 0xffff820efd698080    - smss.exe               - 0x1cc     - 0x6       - 0x2     - 0x35      - ------    - 0x0    - 2021-11-08 14:07:31    -                        =
= [0x4]  - 0xffff820efd996140    - csrss.exe              - 0x24c     - 0x242     - 0xc     - 0x2b1     - 0x0       - 0x0    - 2021-11-08 14:07:33    -                        =
= [0x5]  - 0xffff820efe526140    - wininit.exe            - 0x31c     - 0x242     - 0x2     - 0xa6      - 0x0       - 0x0    - 2021-11-08 14:07:34    -                        =
= [0x6]  - 0xffff820efe530080    - csrss.exe              - 0x324     - 0x316     - 0xf     - 0x377     - 0x1       - 0x0    - 2021-11-08 14:07:34    -                        =
= [0x7]  - 0xffff820efe5892c0    - services.exe           - 0x370     - 0x31c     - 0x9     - 0x2ae     - 0x0       - 0x0    - 2021-11-08 14:07:34    -                        =
= [0x8]  - 0xffff820efe51d080    - lsass.exe              - 0x378     - 0x31c     - 0xc     - 0x607     - 0x0       - 0x0    - 2021-11-08 14:07:34    -                        =
= [0x1c] - 0xffff820eff1130c0    - NVDisplay.Container.ex - 0x718     - 0x372     - 0x6     - 0xe4      - 0x0       - 0x0    - 2021-11-08 14:07:35    -                        =
= [0x47] - 0xffff820eff873080    - WirelessKB850Notifi    - 0xf0c     - 0x1       - 0x1     - 0x67      - 0x0       - 0x0    - 2021-11-08 14:07:35    -                        =
= [0x5a] - 0xffff820f010f3080    - svchost.exe            - 0x894     - 0x372     - 0x0     - ------    - 0x0       - 0x0    - 2021-11-08 14:13:35    - 2021-11-08 14:13:40    =
= [0x5b] - 0xffff820f011020c0    - SecurityHealthService. - 0x770     - 0x1       - 0x6     - 0x1a2     - 0x0       - 0x0    - 2021-11-08 14:17:42    -                        =
= [0x5c] - 0xffff820eff5ab080    - svchost.exe            - 0x1778    - 0x372     - 0x5     - 0xd0      - 0x0       - 0x0    - 2021-11-08 18:07:36    -                        =
```