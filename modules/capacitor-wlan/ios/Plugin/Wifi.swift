import Foundation

@objc public class wifi: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
