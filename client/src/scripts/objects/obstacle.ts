import type { Game } from "../game";
import { GameObject } from "../types/gameObject";

import type { ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import type { ObjectType } from "../../../../common/src/utils/objectType";

import type { ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import type { Variation, Orientation } from "../../../../common/src/typings";
import { orientationToRotation } from "../utils/misc";
import type { Hitbox } from "../../../../common/src/utils/hitbox";
import { calculateDoorHitboxes, velFromAngle } from "../../../../common/src/utils/math";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { randomBoolean, randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { PIXI_SCALE } from "../utils/constants";
import { EaseFunctions, Tween } from "../utils/tween";
import { type Vector } from "../../../../common/src/utils/vector";

export class Obstacle extends GameObject<ObjectCategory.Obstacle, ObstacleDefinition> {
    scale!: number;

    variation!: Variation;

    image: SuroiSprite;

    damageable = true;

    isDoor?: boolean;
    door?: {
        closedHitbox?: Hitbox
        openHitbox?: Hitbox
        openAltHitbox?: Hitbox
        hitbox?: Hitbox
        offset: number
    };

    isNew = true;

    hitbox!: Hitbox;

    orientation!: Orientation;

    particleFrames: string[] = [];

    constructor(game: Game, type: ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>, id: number) {
        super(game, type, id);

        this.image = new SuroiSprite(); //.setAlpha(0.5);
        this.container.addChild(this.image);

        const definition = this.type.definition;

        this.isDoor = this.type.definition.isDoor;
        if (this.isDoor) {
            this.door = { offset: 0 };
            this.image.anchor.set(0, 0.5);
        }

        if (definition.invisible) this.container.visible = false;

        // If there are multiple particle variations, generate a list of variation image names
        const particleImage = definition.frames?.particle ?? `${definition.idString}_particle`;

        if (definition.particleVariations) {
            for (let i = 0; i < definition.particleVariations; i++) {
                this.particleFrames.push(`${particleImage}_${i + 1}.svg`);
            }
        } else {
            this.particleFrames.push(`${particleImage}.svg`);
        }
    }

    override deserializePartial(stream: SuroiBitStream): void {
        this.scale = stream.readScale();
        const destroyed = stream.readBoolean();

        const definition = this.type.definition;

        if (definition.isDoor && this.door !== undefined) {
            const offset = stream.readBits(2);

            if (offset !== this.door.offset) {
                this.door.offset = offset;
                if (!this.isNew) {
                    if (offset === 0) this.playSound("door_close", 0.3);
                    else this.playSound("door_open", 0.3);
                    // eslint-disable-next-line no-new
                    new Tween(this.game, {
                        target: this.image,
                        to: { rotation: orientationToRotation(offset) },
                        duration: 150
                    });
                } else {
                    this.image.setRotation(orientationToRotation(this.door.offset));
                }

                if (this.door.offset === 1) {
                    this.door.hitbox = this.door.openHitbox?.clone();
                } else if (this.door.offset === 3) {
                    this.door.hitbox = this.door.openAltHitbox?.clone();
                } else {
                    this.door.hitbox = this.door.closedHitbox?.clone();
                }
                if (this.door.hitbox) this.hitbox = this.door.hitbox;
            }
        }

        this.image.scale.set(this.dead ? 1 : this.scale);

        // Change the texture of the obstacle and play a sound when it's destroyed
        if (!this.dead && destroyed) {
            this.dead = true;
            if (!this.isNew) {
                this.playSound(`${definition.material}_destroyed`, 0.2);
                if (definition.noResidue) {
                    this.image.setVisible(false);
                } else {
                    this.image.setFrame(`${definition.frames?.residue ?? `${definition.idString}_residue`}.svg`);
                }
                this.container.rotation = this.rotation;
                this.container.scale.set(this.scale);

                this.game.particleManager.spawnParticles(10, () => ({
                    frames: this.particleFrames,
                    position: this.hitbox.randomPoint(),
                    depth: (definition.depth ?? 0) + 1,
                    lifeTime: 1500,
                    rotation: {
                        start: randomRotation(),
                        end: randomRotation()
                    },
                    scale: randomFloat(0.65, 0.85),
                    alpha: {
                        start: 1,
                        end: 0,
                        ease: EaseFunctions.sextIn
                    },
                    speed: velFromAngle(randomRotation(), randomFloat(0.25, 0.5) * (definition.explosion ? 3 : 1))
                }));
            }
        }
        this.container.zIndex = this.dead ? 0 : definition.depth ?? 0;

        if (!this.isNew && !this.isDoor) {
            this.hitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
        }
    }

    override deserializeFull(stream: SuroiBitStream): void {
        // Get position, rotation, and variations
        this.position = stream.readPosition();

        const pos = toPixiCoords(this.position);
        this.container.position.copyFrom(pos);

        const definition = this.type.definition;

        if (definition.isDoor && this.door !== undefined && this.isNew) {
            let offsetX: number;
            let offsetY: number;
            if (definition.hingeOffset !== undefined) {
                offsetX = definition.hingeOffset.x * PIXI_SCALE;
                offsetY = definition.hingeOffset.y * PIXI_SCALE;
            } else {
                offsetX = offsetY = 0;
            }
            this.image.setPos(this.image.x + offsetX, this.image.y + offsetY);

            const orientation = stream.readBits(2) as Orientation;

            this.rotation = orientationToRotation(orientation);

            this.hitbox = this.door.closedHitbox = definition.hitbox.transform(this.position, this.scale, orientation);
            ({ openHitbox: this.door.openHitbox, openAltHitbox: this.door.openAltHitbox } = calculateDoorHitboxes(definition, this.position, orientation));
        } else {
            const obstacleRotation = stream.readObstacleRotation(definition.rotationMode);
            this.rotation = obstacleRotation.rotation;
            this.orientation = obstacleRotation.orientation;
        }

        const hasVariations = definition.variations !== undefined;
        if (hasVariations) this.variation = stream.readVariation();

        if (this.dead && definition.noResidue) {
            this.image.setVisible(false);
        } else {
            let texture = definition.frames?.base ?? `${definition.idString}`;
            if (this.dead) texture = definition.frames?.residue ?? `${definition.idString}_residue`;
            else if (hasVariations) texture += `_${this.variation + 1}`;
            // Update the obstacle image
            this.image.setFrame(`${texture}.svg`);
        }

        this.container.rotation = this.rotation;

        this.container.zIndex = this.dead ? 0 : definition.depth ?? 0;

        this.isNew = false;

        if (!this.isDoor) {
            this.hitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
        }
    }

    hitEffect(position: Vector, angle: number): void {
        this.game.soundManager.play(`${this.type.definition.material}_hit_${randomBoolean() ? "1" : "2"}`, position, 0.1);

        const particleAngle = angle + randomFloat(-0.3, 0.3);

        this.game.particleManager.spawnParticle({
            frames: this.particleFrames,
            position,
            depth: Math.max((this.type.definition.depth ?? 0) + 1, 4),
            lifeTime: 600,
            scale: { start: 0.9, end: 0.2 },
            alpha: { start: 1, end: 0.65 },
            speed: velFromAngle(particleAngle, randomFloat(0.25, 0.75))
        });
    }

    destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
