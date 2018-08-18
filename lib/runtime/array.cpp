#include <cstdint>
#include <new>
#include "gc.h"

template<typename T>
class Array {
  T* elements;
  uint32_t size;
  uint32_t capacity;

public:
  Array() : elements(nullptr), size(0), capacity(0) {}

  void push(T value) {
    if (size == capacity) {
      expand();
    }

    elements[size] = value;
    size++;
  }

private:
  void expand() {
    reserve(capacity ? capacity * 2 : 1);
  }

  void reserve(uint32_t minCapacity) {
    if (minCapacity > capacity) {
      elements = static_cast<T*>(gc__reallocate(elements, sizeof(T) * minCapacity));
      capacity = minCapacity;
    }
  }
};

extern "C" {

Array<double>* Array__number__constructor() {
  auto* array = gc__allocate(sizeof(Array<double>));
  return new (array) Array<double>();
}

void Array__number__push(Array<double>* array, double value) {
  array->push(value);
}

}
