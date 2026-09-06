# Gongjing 共境: Computational worldspace

Gongjing (共境) is an experimental framework for representing **how parts of a system influence one another**. Its goal is to help people and scientific AI tools use the same computer model to test changes and compare outcomes. This shared environment, called a **computational worldspace**, holds the parts of a system, their current conditions, their influences, the rules for change, and the observations collected as the model runs.

[![Gongjing computational worldspace: sunlight and gravity drive the water cycle, while a human agent uses channels, a dam and a power plant to change water flow and generate electricity. An inset connects the water cycle, watershed and local infrastructure as entities, states and influences.](assets/gongjing-computational-worldspace.png)](assets/gongjing-computational-worldspace.png)

*Conceptual overview. Natural processes and purposeful actions both change influences within a shared world. The inset represents the same system at three connected scales. Click the figure to view it at full size.*

## The core idea: influence

An **influence** describes how one part of a system can change another part's state or behavior. For example, sunlight warms water, gravity moves water downhill, and a dam changes where water is stored and when it is released.

| Concept | Plain-English meaning | Example in the figure |
| --- | --- | --- |
| **Entity** | A part of the world represented in the model. | Water, a river, a dam or a person. |
| **Influence** | The capacity of one entity to change another. | Solar heating changes water temperature; a gate changes flow. |
| **Resource** | An entity or relationship that is useful for a particular goal. | Stored water and the energy available as it moves to a lower elevation can support electricity generation. |
| **Agent** | An entity with agency: it can observe conditions and choose actions toward a goal. | A person monitors water level, flow and power, then adjusts a gate. |

**Agents can reorganize entities and use resources to change influences.** A channel redirects water, a dam regulates its release, and a turbine makes its energy useful for generating electricity. An agent is therefore a kind of entity; being a resource is a role that depends on the goal and situation.

## One world, connected scales

The figure links the **water cycle**, a **watershed**, and a **dam and power plant**. Rainfall supplies the watershed, the reservoir supplies water to the local infrastructure, and gate decisions change downstream flow. Water returning to the ocean connects the watershed back to the broader cycle.

In the computational view, nodes represent entities and their recorded states, such as water level, gate opening and power output. Arrows represent influences. Connecting these scales lets a model relate local actions to wider changes. Representing these relationships for shared use by people and AI is Gongjing's development goal.

The figure illustrates the broader idea. The demonstrations below implement selected, simplified interactions; they do not simulate the complete water cycle, dam operation or hydropower system shown in the illustration.

This repository contains interactive **proofs of concept**: early working examples used to explore the idea.

## Explore the demonstrations

Open [the introduction](index.html), then choose a demonstration:

| Demonstration | What to look for |
| --- | --- |
| [Influence cells v17](v17.html) | Small colored cells change the influence passing through them. The influence affects which cells survive or appear. |
| [Influence cells v18.1](v18.html) | Inputs have a wider range of rhythms. Turn on **Strength walk** to let their strengths drift over time. |
| [Watershed geomorphology](watershed.html) | Water, ground and plants interact. Compare the same landscape with erosion on and off. |
| [Portable watershed showcase](Gongjing_Watershed_Ecosystem_Showcase.html) | The complete watershed computational worldspace, including its interface and parameters, packaged in one HTML file. |
| [Related river and colony experiment](river.html) | Water and small groups of cells affect one another in a single flowing river scene. |

A **cellular automaton** is a grid whose cells change according to rules. The influence cellular automata and the river simulation are proofs of concept for Gongjing. They let visitors change conditions and observe the result.

Each page includes a short guide. No account, installation, external service, or API key is needed. The models run in the browser.

The portable watershed showcase is the same live Gongjing example as `watershed.html`, but its styles, core, watershed module, renderer and controls are embedded in one file. This makes it useful as a self-contained demonstration or archived example. It is not a separate scientific model.

## The Gongjing backend

The watershed uses **GongjingCore** and a **WatershedAdapter**. Its controls call the core to start the world, advance it, read results, and change conditions. The module calculates water flow, ground lowering and plant growth. The view draws the observation fields returned by Gongjing. The calculation code is separate from the drawing code.

Here, “backend” means the simulation engine running in the browser. A separate server is not required. The watershed keeps the original showcase's single landscape view and colors, with live calculations in place of stored playback frames. The related river experiment uses the same core with **RiverColonyAdapter**. The v17 and v18.1 cell demonstrations retain their original simulation code, with simpler introductions and navigation.

## Try a watershed experiment

1. Open the watershed and select **Watch from the start**. Blue flow paths and brown areas of ground lowering develop as the model advances.
2. Choose **No erosion**, then **Full feedback**. Both conditions start from the same landscape number and run for 280 steps.
3. Hide water and plants to inspect the ground. Use the timeline to compare earlier calculated states; the measurements follow the displayed step.
4. Open **Gongjing worldspace parameters** to inspect the live worldspace record, change selected influence rules, or save the experiment state.

Open **Inspect the Gongjing architecture and live calls** to see its six commands and recent calls. Landscape number 0 reproduces the original benchmark's starting fields. Other numbers generate repeatable new landscapes.

The longer-term aim is to help people and scientific AI tools explore, compare, and explain models through a shared interface. These pages do not yet demonstrate independent AI research.

## Scope

These are simplified, synthetic worlds. Influence values in the cell models are abstract quantities. The watershed uses relative values and simplified downstream routing. It demonstrates landscape change, but has not been calibrated to a real watershed. It does not model storm timing, water storage or a sediment transport budget. The demonstrations support exploration of feedback and pattern formation, not flood forecasting or engineering decisions.

See [model and version notes](MODEL_NOTES.md) for the source versions, model assumptions, and software interface.

## Run or host

Open `index.html` locally, or serve this directory with any static web server. For example:

```bash
python3 -m http.server 8000
```

For GitHub Pages, choose **Deploy from a branch**, then select **main** and **/ (root)** in the repository's Pages settings. The `.nojekyll` file enables direct static-file publishing. No build step is needed.
