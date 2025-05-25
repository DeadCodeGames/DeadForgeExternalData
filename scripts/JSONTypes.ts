export interface GameJSON {
    matches: {
        source: string;
        id: string;
    }[];
}

export interface MediaObject {
    filePath: string | Record<string, string>;
    remoteUrl: string | Record<string, string>;
}

export interface MediaObjectWithPosition extends MediaObject {
    logo_position: {
        pinnedPosition: string;
        heightPct: number;
        widthPct: number;
    };
}

export interface CuratedGameObject extends GameJSON {
    media: {
        iconUrl?: MediaObject;
        heroUrl?: MediaObject;
        logoUrl?: MediaObjectWithPosition;
        headerUrl?: MediaObject;
        capsuleUrl?: MediaObject;
    };
}

export type CuratedGameJSON = CuratedGameObject | CuratedGameObject[];

export interface NoteObject {
    type: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
}

export interface NoteJSON extends GameJSON {
    notes: NoteObject[];
}

export const CuratedGameExample = {
    "Array(matches)": [
        {
            source: "string",
            id: "string"
        }
    ],
    "Object(media)": {
        "Object(iconUrl,identical=filePath;remoteUrl)": {
            filePath: "string",
            remoteUrl: "string",
        },
        "Object(heroUrl,identical=filePath;remoteUrl)": {
            filePath: "string",
            remoteUrl: "string",
            "Object(filePath)": {
                "*": "string"
            },
            "Object(remoteUrl)": {
                "*": "string"
            },
        },
        "Object(logoUrl,identical=filePath;remoteUrl)": {
            filePath: "string",
            remoteUrl: "string",
            "Object(filePath)": {
                "*": "string"
            },
            "Object(remoteUrl)": {
                "*": "string"
            },
            "Object(logo_position)": {
                "Enum(pinned_position)": {
                    type: "string",
                    enum: ["BottomLeft", "CenterCenter", "UpperCenter", "BottomCenter"]
                },
                height_pct: "number",
                width_pct: "number",
            },
        },
        "Object(headerUrl,identical=filePath;remoteUrl)": {
            filePath: "string",
            remoteUrl: "string",
            "Object(filePath)": {
                "*": "string"
            },
            "Object(remoteUrl)": {
                "*": "string"
            },
        },
        "Object(capsuleUrl,identical=filePath;remoteUrl)": {
            filePath: "string",
            remoteUrl: "string",
            "Object(filePath)": {
                "*": "string"
            },
            "Object(remoteUrl)": {
                "*": "string"
            },
        },
    }
}

export const NoteExample = {
    "Array(matches)": [
        {
            source: "string",
            id: "string"
        }
    ],
    "Array(notes)": [
        {
            "Enum(type)": { type: "string", enum: ["security_warning", "compatibility_warning", "content_warning", "info"] },
            "Enum(severity)": { type: "string", enum: ["low", "medium", "high", "none"] },
            title: "string",
            description: "string",
            recommendation: "string"
        }
    ]
}
