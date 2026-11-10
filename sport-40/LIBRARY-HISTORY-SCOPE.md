# Shared library additions for historical import

Local-only candidate based on clean Sport v5 d2d966b8f93c8eda6eb5e78bdf230a1134e326bb. Original checkout and frozen import candidates remain untouched. No account state, authentication, server or deployed Site is changed.

## Current public additions

1. machine-plate-loaded-seated-calf: Подъём на носки сидя в тренажёре с блинами / Plate-loaded seated calf raise. Plate loading is explicit. The logging convention is added plates only, not body mass, lever tare or measured muscle force.
2. machine-independent-lever-row: Тяга в тренажёре с независимыми рычагами / Independent-lever machine row. Independent arms are explicit. Support and order of arm action are unspecified; no bench is required by this definition. Record total external load, with no automatic machine starting-resistance conversion.
3. dumbbell-bilateral-simultaneous-row: Тяга двух гантелей в наклоне одновременно / Simultaneous two-dumbbell bent-over row. Both arms move together. Support is unspecified. Record one dumbbell's weight without doubling it.

4. dumbbell-incline-chest-supported-reverse-fly: Разведение гантелей на заднюю дельту с опорой грудью на наклонную скамью / Chest-supported incline dumbbell reverse fly. Rear-delt reverse fly with chest support on an incline bench, not a push-up or a row. Weight accounting remains unknown; original values are never doubled or otherwise converted.

All original 133 seed entries remain byte-equivalent as JSON values. Existing generic calf, lever row, one-arm row, chest-supported row and cable pushdown are not renamed or redefined. No alternating/one-arm expansion or selectorized-calf card is included in this bounded stage. Public additions are seed definitions with app scope and muscle-map entries, never user custom exercises or overrides.

## Languages and references

The current general catalog uses Russian name and English en plus search aliases. It has no locale switch, German-name field or translated-description framework. English is searchable; normal cards display Russian. Russian names here are descriptive translations, not claims of official manufacturer translation.

- [Legend Fitness plate-loaded seated calf](https://www.legendfitness.com/product/seated-calf-pl/) supports the equipment distinction. No model-specific resistance or historical values are inferred.
- [Hammer Strength Iso-Lateral Row](https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-row) is an example of independent arms. That specific model has chest support; the catalog's unspecified-support identity does not assert that the historical machine was this model.
- [PureGym dumbbell bent-over row](https://www.puregym.com/exercises/back/rows/dumbbell-bent-over-row/) illustrates two dumbbells moving together. The app's identity does not infer historical support from the example.

- [ACE Incline Reverse Fly](https://www.acefitness.org/resources/everyone/exercise-library/34/incline-reverse-fly/) and [Catalyst Athletics Incline Bench Rear Delt Fly](https://www.catalystathletics.com/exercise/848/Incline-Bench-Rear-Delt-Fly/) support the fourth movement and chest/incline support. No historical load basis is inferred.

Descriptions are brief original paraphrases, not copied instructions or images. references metadata is retained, but the current Instructions tab displays plain description rather than clickable source links.

## Import and data boundaries

The reviewed native additive importer and occurrence-metric repeat patch are integrated without changing auth, owner/session checks, Web Locks, transport guard, CAS, recovery or automatic synchronization. All-or-nothing unresolved/conflict protection remains. No partial/deferred importer mode is introduced.

Private source decisions and exact source hashes live outside the candidate. They are never built into the Site. Any historical equipment uncertainty or user-selected approximate binding must remain visible in the occurrence preview/notes. The generic public library is not a record of what the user actually did.

The user must reload open Sport tabs to receive newly published catalog definitions before eventual import. Older clients retain unknown occurrence objects in JSON but cannot offer complete new-card instructions/reuse. This preparation stage does not publish. A separately authorized owner performs publication only after final review.
