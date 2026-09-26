package com.loqata.store;

import android.view.*;
import android.widget.*;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.loqata.store.model.Product;
import java.util.*;
import java.util.Locale;

public class ProductAdapter extends RecyclerView.Adapter<ProductAdapter.Holder> {
    public interface Listener { void onAdd(Product p); }

    private final List<Product> all = new ArrayList<>();
    private final List<Product> shown = new ArrayList<>();
    private final Listener listener;

    public ProductAdapter(Listener listener) {
        this.listener = listener;
    }

    public void setProducts(List<Product> products) {
        all.clear();
        shown.clear();
        if (products != null) {
            all.addAll(products);
            shown.addAll(products);
        }
        notifyDataSetChanged();
    }

    public void filter(String q) {
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        shown.clear();
        if (needle.isEmpty()) shown.addAll(all);
        else for (Product p : all) {
            String hay = ((p.name == null ? "" : p.name) + " " +
                    (p.description == null ? "" : p.description)).toLowerCase(Locale.ROOT);
            if (hay.contains(needle)) shown.add(p);
        }
        notifyDataSetChanged();
    }

    public List<Product> allProducts() { return new ArrayList<>(all); }

    @NonNull public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_product, parent, false);
        return new Holder(v);
    }

    public void onBindViewHolder(@NonNull Holder h, int position) {
        Product p = shown.get(position);
        h.emoji.setText(p.emoji == null || p.emoji.isBlank() ? "🛍️" : p.emoji);
        h.name.setText(p.name == null ? "منتج" : p.name);
        h.description.setText(p.description == null ? "" : p.description);
        double price = p.activePrice();
        h.price.setText(String.format(Locale.US, "%.0f ج.م", price));
        h.stock.setText("متاح: " + p.stock + " قطعة");
        h.add.setEnabled(p.stock > 0);
        h.add.setText(p.stock > 0 ? "أضف" : "نفد");
        h.add.setOnClickListener(v -> listener.onAdd(p));
    }

    public int getItemCount() { return shown.size(); }

    static class Holder extends RecyclerView.ViewHolder {
        TextView emoji, name, description, price, stock;
        Button add;
        Holder(View item) {
            super(item);
            emoji = item.findViewById(R.id.productEmoji);
            name = item.findViewById(R.id.productName);
            description = item.findViewById(R.id.productDescription);
            price = item.findViewById(R.id.productPrice);
            stock = item.findViewById(R.id.productStock);
            add = item.findViewById(R.id.addButton);
        }
    }
}
