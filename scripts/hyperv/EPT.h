
// sizeof=0x8
struct _VMX_EPTP
{                                       
   unsigned __int64 Type : 3;
   unsigned __int64 PageWalkLength : 3;
   unsigned __int64 EnableAccessAndDirtyFlags : 1;
   unsigned __int64 Reserved : 5;
   unsigned __int64 PageFrameNumber : 36;
   unsigned __int64 ReservedHigh : 16;
};

// sizeof=0x8
struct _VMX_PDPTE
{
    unsigned __int64 Read : 1;
    unsigned __int64 Write : 1;
    unsigned __int64 Execute : 1;
    unsigned __int64 Reserved : 5;
    unsigned __int64 Accessed : 1;
    unsigned __int64 SoftwareUse : 1;
    unsigned __int64 UserModeExecute : 1;
    unsigned __int64 SoftwareUse2 : 1;
    unsigned __int64 PageFrameNumber : 36;
    unsigned __int64 ReservedHigh : 4;
    unsigned __int64 SoftwareUseHigh : 12;
};

typedef union _EPT_PML4E
{
    struct
    {
        unsigned __int64 Read : 1;                // Bit 0
        unsigned __int64 Write : 1;               // Bit 1
        unsigned __int64 Execute : 1;             // Bit 2
        unsigned __int64 Reserved1 : 5;           // Bits 3-7
        unsigned __int64 Accessed : 1;            // Bit 8
        unsigned __int64 Ignored1 : 1;            // Bit 9
        unsigned __int64 UserModeExecute : 1;     // Bit 10 (Mode-based execute control)
        unsigned __int64 Ignored2 : 1;            // Bit 11
        unsigned __int64 PageFrameNumber : 40;    // Bits 12-51 (Address of EPT PDP Table)
        unsigned __int64 Ignored3 : 11;           // Bits 52-62
        unsigned __int64 SuppressVE : 1;          // Bit 63 (#VE suppression)
    };
    unsigned __int64 Value;
} EPT_PML4E, *PEPT_PML4E;

typedef union _EPT_PDPTE
{
    // Table 30-4: Format of an EPT PDPTE that References an EPT Page Directory
    struct
    {
        unsigned __int64 Read : 1;                // Bit 0
        unsigned __int64 Write : 1;               // Bit 1
        unsigned __int64 Execute : 1;             // Bit 2 (Supervisor-mode execute if MBEC is 1)
        unsigned __int64 Reserved1 : 5;           // Bits 7:3 (Must be 0)
        unsigned __int64 Accessed : 1;            // Bit 8
        unsigned __int64 Ignored1 : 1;            // Bit 9
        unsigned __int64 UserModeExecute : 1;     // Bit 10
        unsigned __int64 Ignored2 : 1;            // Bit 11
        unsigned __int64 PageFrameNumber : 40;    // Bits 51:12 (4-KByte aligned address)
        unsigned __int64 Ignored3 : 12;           // Bits 63:52
    } Table;

    // When PageSize (Bit 7) == 1: Points to a 1GB Page
    struct
    {
        unsigned __int64 Read : 1;                // Bit 0
        unsigned __int64 Write : 1;               // Bit 1
        unsigned __int64 Execute : 1;             // Bit 2
        unsigned __int64 MemoryType : 3;          // Bits 3-5 (EPT Memory Type)
        unsigned __int64 IgnorePAT : 1;           // Bit 6
        unsigned __int64 PageSize : 1;            // Bit 7 (Must be 1 for 1GB page)
        unsigned __int64 Accessed : 1;            // Bit 8 <-- Depends on EPTP's "EnableAccessAndDirtyFlags" bit
        unsigned __int64 Dirty : 1;               // Bit 9 <-- Depends on EPTP's "EnableAccessAndDirtyFlags" bit
        unsigned __int64 UserModeExecute : 1;     // Bit 10
        unsigned __int64 Ignored1 : 1;            // Bit 11
        unsigned __int64 Reserved1 : 18;          // Bits 12-29 (Must be 0 for 1GB page)
        unsigned __int64 PageFrameNumber : 22;    // Bits 30-51 (Physical Address >> 30)
        unsigned __int64 Ignored2 : 11;           // Bits 52-62
        unsigned __int64 SuppressVE : 1;          // Bit 63
    } Page1GB;

    unsigned __int64 Value;

} EPT_PDPTE, *PEPT_PDPTE;

typedef union _EPT_PDE
{
    // When PageSize (Bit 7) is 0: Points to an EPT Page Table
    struct
    {
        unsigned __int64 Read : 1;
        unsigned __int64 Write : 1;
        unsigned __int64 Execute : 1;
        unsigned __int64 Reserved1 : 4;
        unsigned __int64 PageSize : 1;            // Bit 7 (Must be 0)
        unsigned __int64 Accessed : 1;
        unsigned __int64 Ignored1 : 1;
        unsigned __int64 UserModeExecute : 1;
        unsigned __int64 Ignored2 : 1;
        unsigned __int64 PageFrameNumber : 40;    // Bits 12-51 (Address of EPT Page Table)
        unsigned __int64 Ignored3 : 11;
        unsigned __int64 SuppressVE : 1;
    } Table;

    // When PageSize (Bit 7) is 1: Points to a 2MB Page
    struct
    {
        unsigned __int64 Read : 1;
        unsigned __int64 Write : 1;
        unsigned __int64 Execute : 1;
        unsigned __int64 MemoryType : 3;
        unsigned __int64 IgnorePAT : 1;
        unsigned __int64 PageSize : 1;            // Bit 7 (Must be 1)
        unsigned __int64 Accessed : 1;
        unsigned __int64 Dirty : 1;
        unsigned __int64 UserModeExecute : 1;
        unsigned __int64 Ignored1 : 1;
        unsigned __int64 PageFrameNumber : 40;    // Bits 12-51 (Physical Address of 2MB page)
        unsigned __int64 Ignored2 : 11;
        unsigned __int64 SuppressVE : 1;
    } Page2MB;

    unsigned __int64 Value;
} EPT_PDE, *PEPT_PDE;

typedef union _EPT_PTE
{
    struct
    {
        unsigned __int64 Read : 1;
        unsigned __int64 Write : 1;
        unsigned __int64 Execute : 1;
        unsigned __int64 MemoryType : 3;          // Bits 3-5
        unsigned __int64 IgnorePAT : 1;           // Bit 6
        unsigned __int64 Ignored1 : 1;            // Bit 7
        unsigned __int64 Accessed : 1;            // Bit 8
        unsigned __int64 Dirty : 1;               // Bit 9
        unsigned __int64 UserModeExecute : 1;     // Bit 10
        unsigned __int64 Ignored2 : 1;            // Bit 11
        unsigned __int64 PageFrameNumber : 40;    // Bits 12-51 (Physical Address of 4KB page)
        unsigned __int64 Ignored3 : 10;           // Bits 52-61
        unsigned __int64 SupervisorShadowStack : 1; // Bit 62
        unsigned __int64 SuppressVE : 1;          // Bit 63
    };
    unsigned __int64 Value;
} EPT_PTE, *PEPT_PTE;
