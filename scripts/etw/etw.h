typedef struct _WMI_TRACE_PACKET
{
    USHORT Size;
    union
    {
        USHORT HookId;
        struct
        {
            UCHAR Type;
            UCHAR Group;
        };
    };
} WMI_TRACE_PACKET, *PWMI_TRACE_PACKET;

typedef struct _SYSTEM_TRACE_HEADER
{
    union
    {
        ULONG Marker;
        struct
        {
            USHORT Version;
            UCHAR HeaderType;
            UCHAR Flags;
        };
    };
    union
    {
        ULONG Header;
        _WMI_TRACE_PACKET Packet;
    };
    ULONG ThreadId;
    ULONG ProcessId;
    ULONG SystemTime;
    ULONG KernelTime;
    ULONG UserTime;
} SYSTEM_TRACE_HEADER, *PSYSTEM_TRACE_HEADER;
