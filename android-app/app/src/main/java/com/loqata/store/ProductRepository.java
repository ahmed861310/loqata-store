package com.loqata.store;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.loqata.store.model.Product;
import java.lang.reflect.Type;
import java.util.*;

public class ProductRepository {
    private static final String PREF = "loqata_product_cache";
    private static final String KEY_JSON = "products_json";
    private static final String KEY_TIME = "products_cache_time";
    private static final long MAX_CACHE_AGE_MS = 6L * 60L * 60L * 1000L;

    private final Context context;
    private final ApiClient api;
    private final SharedPreferences prefs;
    private final Gson gson = new Gson();

    public ProductRepository(Context context) {
        this.context = context.getApplicationContext();
        this.api = new ApiClient();
        this.prefs = this.context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public interface Callback {
        void onData(List<Product> products, boolean fromCache);
        void onError(String message);
    }

    public void load(Callback cb) {
        List<Product> cached = readCache();

        // Fast-first: show cache immediately if available.
        if (!cached.isEmpty()) cb.onData(cached, true);

        if (!NetworkState.isOnline(context)) {
            if (cached.isEmpty()) cb.onError("لا يوجد اتصال بالإنترنت ولا توجد بيانات محفوظة بعد.");
            return;
        }

        api.products(new ApiClient.Result<>() {
            @Override public void ok(List<Product> value) {
                List<Product> safe = value == null ? Collections.emptyList() : value;
                if (!safe.isEmpty()) writeCache(safe);
                cb.onData(safe, false);
            }

            @Override public void error(String message) {
                if (cached.isEmpty()) cb.onError(message);
            }
        });
    }

    public boolean cacheIsFresh() {
        long t = prefs.getLong(KEY_TIME, 0L);
        return t > 0 && (System.currentTimeMillis() - t) < MAX_CACHE_AGE_MS;
    }

    private List<Product> readCache() {
        try {
            String raw = prefs.getString(KEY_JSON, "[]");
            Type type = new TypeToken<List<Product>>(){}.getType();
            List<Product> list = gson.fromJson(raw, type);
            return list == null ? new ArrayList<>() : list;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private void writeCache(List<Product> products) {
        prefs.edit()
                .putString(KEY_JSON, gson.toJson(products))
                .putLong(KEY_TIME, System.currentTimeMillis())
                .apply();
    }
}
