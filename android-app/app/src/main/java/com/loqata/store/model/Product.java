package com.loqata.store.model;

public class Product {
    public long id;
    public String name;
    public String description;
    public String category;
    public String emoji;
    public double price;
    public double salePrice;
    public int stock;

    public double activePrice() {
        return salePrice > 0 && salePrice < price ? salePrice : price;
    }
}
