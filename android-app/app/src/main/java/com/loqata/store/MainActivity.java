package com.loqata.store;

import android.content.*;
import android.os.Bundle;
import android.text.*;
import android.view.View;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.loqata.store.model.Product;
import java.util.*;

public class MainActivity extends AppCompatActivity {
    private ProductAdapter adapter;
    private CartStore cart;
    private ProductRepository repository;
    private ProgressBar progress;
    private TextView empty, cartSummary;
    private Button checkout;
    private List<Product> products = new ArrayList<>();
    private boolean hasShownProducts = false;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        getWindow().getDecorView().setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        cart = new CartStore(this);
        repository = new ProductRepository(this);

        progress = findViewById(R.id.progress);
        empty = findViewById(R.id.empty);
        cartSummary = findViewById(R.id.cartSummary);
        checkout = findViewById(R.id.checkoutButton);

        RecyclerView list = findViewById(R.id.productsList);
        list.setHasFixedSize(true);
        list.setItemViewCacheSize(10);
        list.setLayoutManager(new LinearLayoutManager(this));

        adapter = new ProductAdapter(p -> {
            cart.add(p);
            updateCart();
            Toast.makeText(this, "تمت إضافة " + p.name, Toast.LENGTH_SHORT).show();
        });
        list.setAdapter(adapter);

        EditText search = findViewById(R.id.searchInput);
        search.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int st, int c, int a) {}
            public void onTextChanged(CharSequence s, int st, int before, int count) {
                adapter.filter(s.toString());
            }
            public void afterTextChanged(Editable e) {}
        });

        checkout.setOnClickListener(v -> {
            if (cart.count() == 0) {
                Toast.makeText(this, "السلة فارغة", Toast.LENGTH_SHORT).show();
                return;
            }
            checkout.setEnabled(false);
            startActivity(new Intent(this, CheckoutActivity.class));
        });

        loadProducts();
    }

    @Override protected void onResume() {
        super.onResume();
        if (checkout != null) checkout.setEnabled(cart != null && cart.count() > 0);
        updateCart();
    }

    private void loadProducts() {
        progress.setVisibility(View.VISIBLE);
        empty.setVisibility(View.GONE);

        repository.load(new ProductRepository.Callback() {
            @Override public void onData(List<Product> value, boolean fromCache) {
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    products = value == null ? new ArrayList<>() : value;
                    adapter.setProducts(products);
                    hasShownProducts = !products.isEmpty();

                    // Keep spinner only while cache is shown and network refresh may still arrive.
                    if (!fromCache || !hasShownProducts) {
                        progress.setVisibility(View.GONE);
                    } else {
                        progress.setVisibility(View.GONE);
                    }

                    empty.setVisibility(products.isEmpty() ? View.VISIBLE : View.GONE);
                    if (fromCache && !NetworkState.isOnline(MainActivity.this)) {
                        Toast.makeText(MainActivity.this,
                                "أنت تشاهد آخر منتجات محفوظة لأن الإنترنت غير متاح.",
                                Toast.LENGTH_SHORT).show();
                    }
                    updateCart();
                });
            }

            @Override public void onError(String message) {
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    progress.setVisibility(View.GONE);
                    if (!hasShownProducts) {
                        empty.setVisibility(View.VISIBLE);
                        empty.setText(message);
                    }
                });
            }
        });
    }

    private void updateCart() {
        if (cart == null || cartSummary == null || checkout == null) return;
        int count = cart.count();
        double total = cart.total(products);
        cartSummary.setText(String.format(Locale.US, "السلة: %d | %.0f ج.م", count, total));
        checkout.setEnabled(count > 0);
    }
}
