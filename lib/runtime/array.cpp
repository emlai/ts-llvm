#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <new>
#include "gc.h"
#include "string.h"

template<typename T>
class Array {
  T* elements;
  uint32_t size;
  uint32_t capacity;

public:
  Array() : elements(nullptr), size(0), capacity(0) {}

  uint32_t length() const {
    return size;
  }

  void push(T value) {
    if (size == capacity) {
      expand();
    }

    elements[size] = value;
    size++;
  }

  // TODO: Return 'undefined' if index is out of bounds.
  T* operator[](uint32_t index) {
    if (index < size) {
      return &elements[index];
    }

    printf("Array index %lu is out of bounds, array size is %lu.\n", (unsigned long) index, (unsigned long) size);
    abort();
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

#define ARRAY_INSTANTIATION(TYPE, TYPENAME)                                                                           \
                                                                                                                      \
Array<TYPE>* Array__##TYPENAME##__constructor() {                                                                     \
  auto* array = gc__allocate(sizeof(Array<TYPE>));                                                                    \
  return new (array) Array<TYPE>();                                                                                   \
}                                                                                                                     \
                                                                                                                      \
void Array__##TYPENAME##__push(Array<TYPE>* array, TYPE value) {                                                      \
  array->push(value);                                                                                                 \
}                                                                                                                     \
                                                                                                                      \
TYPE* Array__##TYPENAME##__subscript(Array<TYPE>* array, double index) {                                              \
  return (*array)[static_cast<uint32_t>(index)];                                                                      \
}                                                                                                                     \
                                                                                                                      \
double Array__##TYPENAME##__length(Array<TYPE>* array) {                                                              \
  return static_cast<double>(array->length());                                                                        \
}                                                                                                                     \

extern "C" {

ARRAY_INSTANTIATION(double, number)
ARRAY_INSTANTIATION(bool, boolean)
ARRAY_INSTANTIATION(string, string)

}
