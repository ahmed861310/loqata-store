package com.loqata.store;

import com.google.gson.*;
import com.google.gson.reflect.TypeToken;
import com.loqata.store.model.Product;
import com.loqata.store.model.ShippingSettings;
import okhttp3.*;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.*;
import java.util.concurrent.TimeUnit;

public class ApiClient {
    private final OkHttpClient http = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build();
    private final Gson gson = new Gson();
    private final String base = BuildConfig.API_BASE_URL.replaceAll("/+$", "");
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    public interface Result<T> {
        void ok(T value);
        void error(String message);
    }

    private String messageFrom(Response response, String raw) {
        try {
            JsonObject o = JsonParser.parseString(raw).getAsJsonObject();
            if (o.has("error")) return o.get("error").getAsString();
            if (o.has("message")) return o.get("message").getAsString();
        } catch (Exception ignored) {}
        return "تعذر الاتصال بالخدمة (" + response.code() + ")";
    }

    public void products(Result<List<Product>> cb) {
        Request req = new Request.Builder().url(base + "/api/products").get().build();
        http.newCall(req).enqueue(new Callback() {
            public void onFailure(Call call, IOException e) { cb.error("تعذر الاتصال بالسيرفر"); }
            public void onResponse(Call call, Response response) throws IOException {
                String raw = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) { cb.error(messageFrom(response, raw)); return; }
                Type type = new TypeToken<List<Product>>(){}.getType();
                List<Product> list = gson.fromJson(raw, type);
                cb.ok(list == null ? Collections.emptyList() : list);
            }
        });
    }

    public void shipping(Result<ShippingSettings> cb) {
        Request req = new Request.Builder().url(base + "/api/shipping-settings").get().build();
        http.newCall(req).enqueue(new Callback() {
            public void onFailure(Call call, IOException e) { cb.error("تعذر تحميل مناطق التوصيل"); }
            public void onResponse(Call call, Response response) throws IOException {
                String raw = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) { cb.error(messageFrom(response, raw)); return; }
                cb.ok(gson.fromJson(raw, ShippingSettings.class));
            }
        });
    }

    public void requestOtp(String phone, Result<JsonObject> cb) {
        post("/api/otp/request", Map.of("phone", phone), cb);
    }

    public void verifyOtp(String challengeId, String phone, String code, Result<JsonObject> cb) {
        Map<String,Object> body = new LinkedHashMap<>();
        body.put("challengeId", challengeId);
        body.put("phone", phone);
        body.put("code", code);
        post("/api/otp/verify", body, cb);
    }

    public void createCodOrder(String name, String phone, String address, String zoneId,
                               String verificationToken, Map<Long,Integer> cart, Result<JsonObject> cb) {
        List<Map<String,Object>> items = new ArrayList<>();
        for (Map.Entry<Long,Integer> e : cart.entrySet()) {
            Map<String,Object> item = new LinkedHashMap<>();
            item.put("id", e.getKey());
            item.put("qty", e.getValue());
            items.add(item);
        }
        Map<String,Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("phone", phone);
        body.put("address", address);
        body.put("shippingZone", zoneId);
        body.put("paymentMethod", "cod");
        body.put("verificationToken", verificationToken);
        body.put("items", items);
        post("/api/orders", body, cb);
    }

    private void post(String path, Object object, Result<JsonObject> cb) {
        RequestBody body = RequestBody.create(gson.toJson(object), JSON);
        Request req = new Request.Builder().url(base + path).post(body).build();
        http.newCall(req).enqueue(new Callback() {
            public void onFailure(Call call, IOException e) { cb.error("تعذر الاتصال بالسيرفر"); }
            public void onResponse(Call call, Response response) throws IOException {
                String raw = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) { cb.error(messageFrom(response, raw)); return; }
                try { cb.ok(JsonParser.parseString(raw).getAsJsonObject()); }
                catch (Exception e) { cb.error("استجابة غير متوقعة من السيرفر"); }
            }
        });
    }
}
