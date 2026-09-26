package com.loqata.store;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.loqata.store.model.Product;
import java.lang.reflect.Type;
import java.util.*;

public class CartStore {
    private static final String PREF = "loqata_cart";
    private static final String KEY = "items";
    private final SharedPreferences prefs;
    private final Gson gson = new Gson();
    private final Map<Long, Integer> items = new LinkedHashMap<>();

    public CartStore(Context context) {
        prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        Type type = new TypeToken<Map<Long, Integer>>(){}.getType();
        try {
            Map<Long, Integer> saved = gson.fromJson(prefs.getString(KEY, "{}"), type);
            if (saved != null) items.putAll(saved);
        } catch (Exception ignored) {}
    }

    public void add(Product p) {
        if (p == null || p.stock <= 0) return;
        int current = items.getOrDefault(p.id, 0);
        if (current < p.stock) items.put(p.id, current + 1);
        save();
    }

    public void clear() {
        items.clear();
        save();
    }

    public int count() {
        int total = 0;
        for (int q : items.values()) total += q;
        return total;
    }

    public Map<Long, Integer> items() {
        return new LinkedHashMap<>(items);
    }

    public double total(List<Product> products) {
        Map<Long, Product> byId = new HashMap<>();
        for (Product p : products) byId.put(p.id, p);
        double total = 0;
        for (Map.Entry<Long, Integer> e : items.entrySet()) {
            Product p = byId.get(e.getKey());
            if (p != null) total += p.activePrice() * e.getValue();
        }
        return total;
    }

    private void save() {
        prefs.edit().putString(KEY, gson.toJson(items)).apply();
    }
}
