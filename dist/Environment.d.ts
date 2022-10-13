declare class Environement {
    #private;
    constructor(key: string);
    GetKey(): string;
}
export declare class StringEnvironment extends Environement {
    constructor(key: string);
    Set(value: string): void;
    Get(): string;
}
export declare class BooleanEnvironment extends Environement {
    constructor(key: string);
    Set(value: Boolean): void;
    Get(): Boolean;
}
export declare class NumberEnvironment extends Environement {
    constructor(key: string);
    Set(value: number): void;
    Get(): number;
}
export {};
