export const Config = {
    regions: {
        dev: {
            name: "Polski Serwer (Rozwój)",
            mainAddress: "http://127.0.0.1:8000",
            gameAddress: "ws://127.0.0.1:9090"
        },
        main: {
            name: "Polski Serwer (Produkcja)",
            mainAddress: "https://suroi.sefinek.net",
            gameAddress: "ws://suroi-ws.sefinek.net:8618"
        }
    },
    defaultRegion: "main",
    mode: "normal"
} satisfies ConfigType as ConfigType;

export interface ConfigType {
    readonly regions: Record<string, Region>
    readonly defaultRegion: string
    readonly mode: string
}

export interface Region {
    /**
     * The human-readable name of the region, displayed in the server selector.
     */
    readonly name: string

    /**
     * The address of the region's main server.
     */
    readonly mainAddress: string

    /**
     * Pattern used to determine the address of the region's game servers.
     * The string <ID> is replaced by the gameID given by the /getGame API, plus one.
     * For example, if gameID is 0, and gameAddress is "ws://127.0.0.1:800<ID>", the resulting address will be ws://127.0.0.1:8001.
     */
    readonly gameAddress: string
}
