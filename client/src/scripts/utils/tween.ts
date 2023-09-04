import { type Game } from "../game";
import { lerp } from "../../../../common/src/utils/math";

export class Tween<T> {
    readonly game: Game;

    readonly target: T;
    readonly duration!: number;

    startValues: Record<string, number> = {};
    endValues: Record<string, number> = {};

    readonly ease?: (x: number) => number;

    yoyo?: boolean;

    readonly onUpdate?: () => void;
    readonly onComplete?: () => void;

    ticker = 0;
    dead = false;

    constructor(
        game: Game,
        config: {
            target: T
            to: Partial<T>
            duration: number
            ease?: (x: number) => number
            yoyo?: boolean
            onUpdate?: () => void
            onComplete?: () => void
        }
    ) {
        this.game = game;
        this.target = config.target;
        for (const key in config.to) {
            this.startValues[key] = config.target[key] as number;
            this.endValues[key] = config.to[key] as number;
        }
        this.duration = config.duration;
        this.ease = config.ease;
        this.yoyo = config.yoyo;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
        this.game.tweens.add(this);
    }

    update(delta: number): void {
        this.ticker += delta;
        if (this.ticker >= this.duration) {
            for (const [key, value] of Object.entries(this.endValues)) {
                (this.target[key as keyof T] as number) = value;
            }
            if (this.yoyo) {
                this.yoyo = false;
                this.ticker = 0;
                [this.startValues, this.endValues] = [this.endValues, this.startValues];
            } else {
                this.kill();
                this.onComplete?.();
            }
            return;
        }
        for (const key in this.startValues) {
            const startValue = this.startValues[key];
            const endValue = this.endValues[key];
            const interpFactor = this.ticker / this.duration;
            (this.target[key as keyof T] as number) = lerp(startValue, endValue, this.ease ? this.ease(interpFactor) : interpFactor);
        }
        this.onUpdate?.();
    }

    kill(): void {
        this.dead = true;
        this.game.tweens.delete(this);
    }
}

// Credit to https://easings.net/
export const EaseFunctions = {
    sextIn: (x: number) => Math.pow(x, 6),
    sineIn: (x: number) => 1 - Math.cos((x * Math.PI) / 2),
    sineOut: (x: number) => Math.sin((x * Math.PI) / 2),
    expoOut: (x: number): number => x === 1 ? 1 : 1 - Math.pow(2, -10 * x),
    elasticOut: (x: number): number => {
        const c4 = (2 * Math.PI) / 3;

        return x === 0
            ? 0
            : x === 1
                ? 1
                : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    },
    backOut: (x: number): number => {
        const c1 = 1.70158;
        const c3 = c1 + 1;

        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
};
