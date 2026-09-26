package com.loqata.store.model;

import java.util.List;

public class ShippingSettings {
    public List<Zone> zones;
    public double freeShippingThreshold;

    public static class Zone {
        public String id;
        public String name;
        public double fee;

        @Override public String toString() {
            return name + " — " + ((long) fee) + " ج.م";
        }
    }
}
