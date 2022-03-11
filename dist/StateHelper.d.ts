export declare class StateHelper {
    static Set(key: string, value: string): void;
    static Get(key: string): string;
}
export declare class StringStateValue {
    key: string;
    constructor(key: string);
    Set(value: string): void;
    Get(): string;
}
export declare class BooleanStateValue {
    key: string;
    constructor(key: string);
    Set(value: Boolean): void;
    Get(): Boolean;
}
