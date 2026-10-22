# competitive_game

Brief tutorial supplementing the Simbrain simulation `Competitive network (simple)`. The sidebars of that sim and of `Competitive grid network` link to https://simbrain.net/misc/competitive_game/.

The interactive part reimplements the sim's learning rule in JavaScript (Rumelhart-Zipser update, winner = largest weighted input, weights and inputs normalized to sum to 1).

## Archive

`archive.html` is the longer working version of the page, kept for reference. It is published (at /misc/competitive_game/archive.html) but not linked from anywhere. It contains material cut from the main page:

- A two-input panel comparing sum-to-1 and length-1 weights.
- Why taking turns fails and committing works.
- Strategy statistics, hard mode, and takeaways.

The strategy numbers in the archive's bar chart were measured with Simbrain's `CompetitiveNetwork` class (2,000 random starts per row, five units, learning rate 0.1 unless noted), using a throwaway JUnit test that is not checked in.
