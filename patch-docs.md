Patches are the solution to mods, as given by the game. All files outside the `src` filder are explicitly off-limits and can not be changed at all. The standard itself is incredibly tiny, as all it does is provide source code manipulation tools.

## File Structure
```
v Patchs
| v ...{patch_ids}
| | index.json // see Index File Shape
| | ...{patch_files}
```

## Index File Shape
| key           | type       | description |
|---------------|------------|-------------|
| `name`        | `string`   | The displayed name of this patch |
| `description` | `string`   | The text that describes this patch to the user |
| `author`      | `string`   | The author(s) that made this patch |
| `version`     | `string`   | The version id of this patch |
| `changes`     | `(['copy', string, string]\|['splice', number, number, string, string])[]` | The changes that need to be made to implement this patch. Under `copy` type, the first argument is what file (from inside this patches folder) to copy from, and the second argument is what file (from inside the `src` folder) to write to, creating if necesary. Under `splice` type, the first argument is where to start the replacement, the second is where to end it, the third is what file (in the `src` folder) to splice into, the last is what text to splice inbetween `start` and `end` |