# Model and version notes

## Included versions

| Public page | Original source |
| --- | --- |
| `v17.html` | `Gongjing_Adaptive_Influence_Cellular_Automaton_v17_entropy_random_worlds.html` |
| `v18.html` | `Gongjing_Adaptive_Influence_Cellular_Automaton_v18_1_strength_random_walk.html` |
| `watershed.html` | `Gongjing_Watershed_Ecosystem_Showcase.html` and the numerical rules in `gongjing_watershed_benchmark.py` |
| `river.html` | `Gongjing_River_Colony_Emergence_API_v10.html` |

The v18 link opens **v18.1**, an update to v18 that adds an optional bounded random walk in source strength. The pages identify this version explicitly.

The cell simulations retain their original JavaScript. Their introductions, navigation, and placement of advanced details have been adapted for a general audience.

The river retains the v10 flow and colony rules. Its Gongjing core, river model, and drawing code are separated into files. The public page adds simpler explanations, live colony counts, a pause-before-step control, and a button for switching the cells' resistance to water on or off. It shows one continuous river scene.

## What the watershed calculates

The watershed is a live 60 × 60 grid model. Each step routes uniformly supplied water toward the lower edge, updates resources and plants, and calculates ground lowering. Lower ground attracts more flow; water changes plants; plants add flow resistance and reduce erosion. The next step uses the changed ground and plants. Channel paths develop from the starting terrain and update rules.

The original showcase displayed stored snapshots. This version runs the numerical rules through Gongjing, then draws its observation fields using the original palette. Only the original starting terrain and plants are stored for landscape number 0. Later states are calculated. Other landscape numbers use a repeatable JavaScript terrain generator.

All six comparison conditions use the same starting terrain for a selected landscape number. Each opens at step 280. **No erosion** removes the erosion term. **No plants** also removes plant growth, resistance and stabilization. **No water damage** removes both the direct plant-damage term and the strong-flow reduction in resource benefit. **Stronger smoothing** increases smoothing of ground lowering. **More erosion** increases the erosion rate. These are controlled model comparisons, not observations of different real watersheds.

The timeline reads calculated snapshots, and all displayed measurements describe the selected snapshot. Continuing returns to the latest model state. The timeline keeps the start and up to 200 recent saved snapshots. Saved experiment files contain the terrain, plants, resources, ground lowering, parameters and intervention record. Loading a file restores its current state; it does not reconstruct earlier timeline snapshots.

The collapsed **Gongjing worldspace parameters** panel separates three kinds of information. **Worldspace record** reports the live domain adapter, scale, grid, step, landscape number, entity kinds, state fields, observations, path summary and calibration status. **Influence rules** exposes selected parameters from the watershed module through Gongjing's `intervene` command: water input, terrain steering, erosion strength, vegetation stabilization, vegetation growth, high-flow plant damage and ground smoothing. **Experiment record** keeps the active condition, intervention count, landscape generator and save or restore controls together. These watershed-specific values are not universal Gongjing parameters; the common element is the interface used to describe, change and record them.

### Numerical checks

At landscape number 0 and step 280, the live JavaScript model matches the original Python calculation for terrain height, flow, plants, resources and ground lowering. The largest absolute field difference is below 1e-8 in model units. In the full-feedback run, the busiest 5% of evaluated cells carry about 47.9% of summed grid flow, average ground lowering is about 0.103 model units, and average plant amount is about 0.297. Flow concentration excludes the first eight grid rows and sums routed flow across the remaining cells; it is not a fraction of distinct water parcels leaving the watershed.

The no-erosion control has zero ground lowering. Checks cover all six conditions at step 280, repeatable restart at additional landscape numbers, continuation after saving and loading, and changes in actual flow when water input changes. Input and bottom outflow agree to numerical rounding. These checks establish implementation consistency, not accuracy for a real watershed.

### Physical scope

Water is distributed among three positions in the next row according to terrain height and plant resistance. It is a downstream routing approximation, not a full two-dimensional fluid solver. Values use relative units. The model has closed sides and an open lower outlet, no water storage or storm timing, and no sediment transport budget. Ground lowering is capped; local smoothing acts on this lowering field. The small deposition term is a local rule, not tracked sediment arriving from upstream. Moving water marks illustrate direction and are not tracked volumes.

Connected high-flow cells can be summarized as candidate paths using the current 90th percentile of flow normalized by grid row. This grouping is descriptive. It does not establish real channel boundaries, ecological entities or independently discovered laws.

## What the related river experiment calculates

Water enters from the top and from the upper sides of a 56 × 64 grid. On each calculation, flow is distributed to positions in the next row. The route depends on a predefined winding river, resistance from colony cells, and memory of previously used routes. Flow leaves at the bottom. Values are relative and have no assigned physical units.

Colony cells start in three small groups, totaling 17 cells with the default settings. Neighboring cells and local flow determine survival and recruitment. At most two cells are recruited per model step. The river corridor is predefined; the later colony pattern is generated by the update rules.

This is a simplified hydrology-inspired model. It does not solve the full equations of fluid motion or model measured terrain, water storage, rainfall events, erosion, or an actual species. The moving water marks illustrate the calculated directions. Their positions are visual effects, not individually tracked water volumes.

The model contains an exploratory pattern score and candidate-pattern rules. Those are descriptive rules within the toy model, not validated measures of real ecological organization. Fixed uncertainty fields in the original observation packets are illustrative placeholders, not measured confidence intervals; they are not shown as error bars on the public page.

## Shared software interface

`assets/gongjing-core.js` provides `GongjingCore` and the `DomainAdapter` interface. `assets/watershed-adapter.js` implements the watershed rules. `assets/watershed-ui.js` sends controls through the core, and `assets/watershed-renderer.js` draws only the returned observations. The core keeps the latest observation packet, model description and candidate-pattern summary as inspectable records. `assets/river-colony-adapter.js` implements the related river model using the same interface.

| Command | Plain-English purpose |
| --- | --- |
| `initialize` | Create a world from a starting number and settings. |
| `step` | Advance the model. |
| `observe` | Read the model's recorded results. |
| `describe` | Inspect its rules and settings. |
| `intervene` | Change a rule or restore a starting state. |
| `coarseGrain` | Summarize candidate patterns across several cells. |

The controls make actual core calls. Opening **Inspect the Gongjing architecture and live calls** shows the recent calls. This browser implementation illustrates the interface; it does not establish that the framework improves scientific reasoning across domains.

## Reading the cell models

The cell models recalculate an abstract influence field. It is not conserved water or physical energy. Cells may reduce, redirect, amplify, or reflect influence. Their survival and reproduction also depend on local conditions.

Version 17 uses four regular source rhythms. Version 18 assigns a wider range of periods, while v18.1 adds the optional source-strength walk. That walk may change the total input. It is not a fixed-budget redistribution.

With **Mutation** off, new cells inherit a type from nearby cells. With it on, local conditions can affect the new type and permit rare reflector recruitment. The toggle is a model-specific rule, not a model of biological genetics.

Replay is useful for comparisons. In the cell demos, leave the **Entropy RNG** option off when repeatability matters. The river's model updates are repeatable from the same starting number and settings; the decorative water marks do not replay pixel for pixel.
