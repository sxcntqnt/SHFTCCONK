```

---

Your full file tree should look like this:
```
src/
└── lib/
    └── features/
        └── race/
            ├── index.ts          ← coordinator (above)
            ├── constants.ts      ✅ done
            ├── firebase.ts       ✅ done
            ├── mapLoader.ts      ✅ done
            ├── stores/
            │   └── stores.ts     (gameStarted, me, players, etc.)
            ├── Car.svelte        ✅ done
            ├── Menu.svelte       ✅ done
            └── +page.svelte      ← your main page